import {
  DetectorError,
  headerSafe,
  TIMEOUT_MS,
  TINY_PNG,
  type Credentials,
  type Detector,
  type DetectorAnswer,
} from "./types";

/*
  Hive AI, модель ai-generated-and-deepfake-content-detection.

  Подпись пришлось выяснять опытом: публичная документация по API долго
  описывала старый v2 с однострочным ключом проекта, а консоль выдаёт пару
  «Access Key ID + Secret Key». Под v2 эта пара не подходит ни в каком
  сочетании — все проверенные дают 403.

  Работает вот что:

      Authorization: Bearer <Secret Key>
      POST https://api.thehive.ai/api/v3/hive/ai-generated-and-deepfake-content-detection
      тело — multipart, поле media

  Access Key ID не нужен вовсе: подписывает секрет.

  Про имя модели: оно часть адреса, и неизвестное даёт 400. Похожее
  «ai-generated-detection» отвечает 403 «This model cannot be accessed via
  API» — это другая, закрытая модель, и перепутать их легко.

  Ответ (проверено живым запросом):

      { "task_id": …, "model": "hive/…",
        "output": [ { "extra": [ {"name":"frame_index","value":0}, … ],
                      "classes": [ {"class":"not_ai_generated","value":0.83},
                                   {"class":"ai_generated","value":0.17},
                                   {"class":"deepfake","value":0.03},
                                   {"class":"sora","value":8.4e-6}, … ] } ] }

  Оценка лежит в поле value, а не score. Это не мелочь: у старого v2 было
  именно score, и переходник, написанный по той документации, молча читал
  бы пустоту и возвращал «числа в ответе нет» на исправном ответе.
*/

const ENDPOINT =
  "https://api.thehive.ai/api/v3/hive/ai-generated-and-deepfake-content-detection";

/** Классы, которые не являются названиями генераторов. */
const SERVICE_CLASSES = new Set([
  "ai_generated",
  "not_ai_generated",
  "deepfake",
  "ai_generated_audio",
  "not_ai_generated_audio",
  "none",
  "other_image_generators",
  "other_video_generators",
]);

type HiveClass = { class?: string; value?: number };
type Reply = {
  task_id?: string;
  model?: string;
  output?: { classes?: HiveClass[] }[];
  message?: string;
};

const valueOf = (classes: HiveClass[], name: string): number | null => {
  const found = classes.find((item) => item.class === name);
  return typeof found?.value === "number" ? found.value : null;
};

async function ask(
  creds: Credentials,
  bytes: Buffer,
  mime: string,
): Promise<DetectorAnswer> {
  const started = Date.now();

  const form = new FormData();
  form.append("media", new Blob([new Uint8Array(bytes)], { type: mime }), "media");

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${headerSafe(creds.secret_key ?? "", "Secret Key")}`,
        accept: "application/json",
      },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new DetectorError("сервис не ответил", String(error).slice(0, 200));
  }

  const text = await response.text();

  if (!response.ok) {
    /*
      Отказы означают разное, и человеку надо сказать, что именно.
      Иначе он видит номер ошибки и ищет опечатку в ключе, которого она
      не касается.
    */
    if (response.status === 403 && text.includes("cannot be accessed via API")) {
      throw new DetectorError(
        "ключ верный, но эта модель для вашей учётной записи не открыта — " +
          "её включают по запросу в Hive",
        text.slice(0, 200),
      );
    }
    if (response.status === 401) {
      throw new DetectorError(
        "ключ не подошёл — нужен Secret Key, а не Access Key ID",
        text.slice(0, 200),
      );
    }
    if (response.status === 429) {
      throw new DetectorError(
        "исчерпан дневной предел — у бесплатного доступа 100 запросов в сутки",
      );
    }
    throw new DetectorError(`сервис ответил ${response.status}`, text.slice(0, 200));
  }

  let body: Reply;
  try {
    body = JSON.parse(text) as Reply;
  } catch {
    throw new DetectorError("ответ не разобрался", text.slice(0, 200));
  }

  /*
    У видео на каждый кадр своя запись в output. Берём наибольшую оценку по
    всем кадрам: у них же самих порог для видео стоит «0.9 на любом кадре»,
    и усреднять здесь значило бы прятать один поддельный кадр среди сотни
    настоящих.
  */
  const frames = body.output ?? [];
  const classes = frames.flatMap((item) => item.classes ?? []);

  if (classes.length === 0) {
    throw new DetectorError(
      "в ответе нет оценок — похоже, переходник разбирает не тот путь",
      text.slice(0, 300),
    );
  }

  const perFrame = frames.map((frame) => valueOf(frame.classes ?? [], "ai_generated"));
  const scores = perFrame.filter((value): value is number => value !== null);
  const score = scores.length > 0 ? Math.max(...scores) : null;

  const deepfake = Math.max(
    0,
    ...frames.map((frame) => valueOf(frame.classes ?? [], "deepfake") ?? 0),
  );

  // Название генератора: самый уверенный класс, не входящий в служебные.
  const generator = classes
    .filter((item) => item.class && !SERVICE_CLASSES.has(item.class))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];

  /*
    Подделку лица показываем отдельной строкой рядом с названием
    генератора. Это независимая оценка, а не часть первой: настоящее видео
    с подменённым лицом не «сгенерировано», и складывать их нельзя.
  */
  const named =
    generator && (generator.value ?? 0) >= 0.5 ? generator.class! : null;
  const withDeepfake =
    deepfake >= 0.5
      ? `${named ?? "—"} · подделка лица ${deepfake.toFixed(2)}`
      : named;

  return {
    score,
    generator: withDeepfake,
    raw: body,
    latencyMs: Date.now() - started,
  };
}

export const hive: Detector = {
  probe: (creds) => ask(creds, TINY_PNG, "image/png"),
  detect: (creds, bytes, mime) => ask(creds, bytes, mime),
};
