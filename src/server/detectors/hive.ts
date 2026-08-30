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
  Hive AI.

  Синхронная задача: один запрос, ответ сразу. Ключ идёт заголовком
  «authorization: token …» — именно так, без слова Bearer; это их
  собственное написание из документации.

  Ответ вложен глубоко:
    status[0].response.output[0].classes[] — список пар «класс, оценка»,
    среди которых ai_generated и not_ai_generated, а во второй голове
    название генератора.

  Что здесь подтверждено документацией, а что взято по их общему обычаю:
  адрес, заголовок и путь к оценке — из документации. Имя поля с файлом
  (media) — обычная для Hive форма, но отдельной страницы с примером я не
  нашёл. Ровно для этого на странице панели и стоит кнопка проверки: живой
  запрос покажет, угадал ли переходник, за один щелчок.
*/

const ENDPOINT = "https://api.thehive.ai/api/v2/task/sync";

type HiveClass = { class?: string; score?: number };
type HiveOutput = { classes?: HiveClass[] };
type Reply = {
  status?: {
    status?: { code?: string; message?: string };
    response?: { output?: HiveOutput[] };
  }[];
  message?: string;
};

/** Оценка класса из плоского списка пар. */
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
        authorization: `token ${headerSafe(creds.token ?? "", "API key")}`,
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
      «Invalid Auth Token» чаще всего означает не опечатку, а не тот вид
      ключа. В консоли Hive выдаются два разных: пара «Access Key ID +
      Secret Key» с правами вида sf1:*, va1:* — это их новая площадка, и
      разбор изображений её не знает; и один project API key из раздела
      «Integration & API Keys» в панели проекта — вот он и нужен.

      Проверено вживую: пара «ключ и секрет» получает 403 во всех
      сочетаниях, а адрес v3 отвечает одинаковым «Bad Request» даже на
      заведомо несуществующий путь, то есть ничего не подтверждает.

      Без этой подсказки человек видит «Invalid Auth Token» при верно
      скопированном ключе и ищет опечатку там, где её нет.
    */
    const wrongKind =
      response.status === 403 && text.includes("Invalid Auth Token");
    throw new DetectorError(
      wrongKind
        ? "ключ не подошёл — похоже, взят не тот: разбору изображений " +
          "нужен project API key из раздела «Integration & API Keys» в " +
          "панели проекта, а не пара «Access Key ID + Secret Key»"
        : `сервис ответил ${response.status}`,
      text.slice(0, 200),
    );
  }

  let body: Reply;
  try {
    body = JSON.parse(text) as Reply;
  } catch {
    throw new DetectorError("ответ не разобрался", text.slice(0, 200));
  }

  const outputs = body.status?.[0]?.response?.output ?? [];
  const classes = outputs.flatMap((item) => item.classes ?? []);

  if (classes.length === 0) {
    // Ответ пришёл, а классов в нём нет: либо путь к ним другой, либо
    // задача не та. Молча вернуть «ничего» нельзя — это выглядело бы
    // добросовестной оценкой.
    throw new DetectorError(
      "в ответе нет оценок — похоже, переходник разбирает не тот путь",
      text.slice(0, 300),
    );
  }

  // Название генератора — вторая голова: там пары вида "flux": 0.98,
  // а класс none означает «не берусь назвать».
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
