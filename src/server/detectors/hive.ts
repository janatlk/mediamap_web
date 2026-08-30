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
  Hive AI, версия API v3.

  Про подпись пришлось выяснять опытом: публичная документация описывает
  старый v2 с однострочным ключом проекта и заголовком «authorization:
  token …», а консоль сейчас выдаёт пару «Access Key ID + Secret Key» с
  правами вида sf1:*, va1:*. Под v2 эта пара не подходит ни в каком
  сочетании — все шесть проверенных дают 403.

  Работает вот что:

    Authorization: Bearer <Secret Key>
    POST https://api.thehive.ai/api/v3/hive/<модель>
    тело — multipart, поле media

  Access Key ID при этом не нужен вовсе: подписывает секрет. Нашлось это
  по адресу /api/v3/auth/token — единственная схема, на которую он
  ответил не «401 неверный токен», а жалобой на Content-Type, то есть
  проверку прав прошёл.

  Имя модели — часть адреса. Неизвестное имя даёт 400 «Bad Request», и по
  этому же признаку модель и нашлась перебором: visual-moderation
  отвечает 200, ai-generated-detection — 403 «This model cannot be
  accessed via API», всё остальное 400.

  Ответ v3 площе, чем был в v2:
    { "task_id": …, "model": "hive/…", "output": [ { "classes": [
        { "class": "ai_generated", "score": 0.99 }, … ] } ] }
*/

const ENDPOINT = "https://api.thehive.ai/api/v3/hive/ai-generated-detection";

type HiveClass = { class?: string; score?: number };
type Reply = {
  task_id?: string;
  model?: string;
  output?: { classes?: HiveClass[] }[];
  message?: string;
};

const scoreOf = (classes: HiveClass[], name: string): number | null => {
  const found = classes.find((item) => item.class === name);
  return typeof found?.score === "number" ? found.score : null;
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
      Три отказа означают три разные вещи, и человеку надо сказать, какую
      именно. Без этого он видит номер ошибки и ищет опечатку в ключе,
      которого она не касается.
    */
    if (response.status === 403 && text.includes("cannot be accessed via API")) {
      throw new DetectorError(
        "ключ верный, но модель разбора изображений для вашей учётной " +
          "записи не открыта — её включают по запросу в Hive",
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
      throw new DetectorError("слишком часто — сервис просит подождать");
    }
    throw new DetectorError(`сервис ответил ${response.status}`, text.slice(0, 200));
  }

  let body: Reply;
  try {
    body = JSON.parse(text) as Reply;
  } catch {
    throw new DetectorError("ответ не разобрался", text.slice(0, 200));
  }

  const classes = (body.output ?? []).flatMap((item) => item.classes ?? []);
  if (classes.length === 0) {
    // Ответ пришёл, а оценок в нём нет. Молча вернуть «ничего» нельзя:
    // это выглядело бы добросовестным разбором.
    throw new DetectorError(
      "в ответе нет оценок — похоже, переходник разбирает не тот путь",
      text.slice(0, 300),
    );
  }

  // Название генератора приходит отдельными классами рядом с оценкой
  // «сгенерировано»; none означает «не берусь назвать».
  const generator = classes
    .filter(
      (item) =>
        item.class &&
        !["ai_generated", "not_ai_generated", "none"].includes(item.class) &&
        (item.score ?? 0) >= 0.5,
    )
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]?.class;

  return {
    score: scoreOf(classes, "ai_generated"),
    generator: generator ?? null,
    raw: body,
    latencyMs: Date.now() - started,
  };
}

export const hive: Detector = {
  probe: (creds) => ask(creds, TINY_PNG, "image/png"),
  detect: (creds, bytes, mime) => ask(creds, bytes, mime),
};
