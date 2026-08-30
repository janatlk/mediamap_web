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
  Reality Defender.

  Три захода вместо одного:
    1. просим у них адрес для загрузки — POST /api/files/aws-presigned;
    2. кладём файл по этому адресу обычным PUT;
    3. ждём разбора — GET /api/media/users/{requestId}, опрашивая.

  Отсюда и медленность: даже маленькая картинка проходит три круга по сети,
  а разбор идёт своим чередом. Ключ — заголовком X-API-KEY.

  Опрос ограничен и по числу попыток, и по общему времени. Без потолка одна
  застрявшая задача держала бы страницу панели открытой до таймаута
  браузера, и человек не понял бы, кто именно завис.
*/

const BASE = "https://api.prd.realitydefender.xyz";
const POLL_EVERY_MS = 1500;
const POLL_LIMIT = 20;

type Presigned = {
  response?: { signedUrl?: string };
  mediaId?: string;
  requestId?: string;
  errno?: number;
};

type Detail = {
  status?: string;
  resultsSummary?: {
    status?: string;
    metadata?: { finalScore?: number };
  };
  models?: { name?: string; status?: string; finalScore?: number | null }[];
};

const head = (creds: Credentials) => ({
  "X-API-KEY": headerSafe(creds.api_key ?? "", "API key"),
  "Content-Type": "application/json",
});

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function ask(
  creds: Credentials,
  bytes: Buffer,
  mime: string,
): Promise<DetectorAnswer> {
  const started = Date.now();
  const name = `mediamap-${Date.now()}.${mime === "image/png" ? "png" : "jpg"}`;

  // --- 1. адрес для загрузки ---
  const signedReply = await fetch(`${BASE}/api/files/aws-presigned`, {
    method: "POST",
    headers: head(creds),
    body: JSON.stringify({ fileName: name }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error) => {
    throw new DetectorError("сервис не ответил", String(error).slice(0, 200));
  });

  const signedText = await signedReply.text();
  if (!signedReply.ok) {
    throw new DetectorError(
      `не дал адрес для загрузки (${signedReply.status})`,
      signedText.slice(0, 200),
    );
  }

  let signed: Presigned;
  try {
    signed = JSON.parse(signedText) as Presigned;
  } catch {
    throw new DetectorError("ответ не разобрался", signedText.slice(0, 200));
  }

  const url = signed.response?.signedUrl;
  const requestId = signed.requestId ?? signed.mediaId;
  if (!url || !requestId) {
    throw new DetectorError(
      "в ответе нет адреса загрузки или номера задачи",
      signedText.slice(0, 300),
    );
  }

  // --- 2. заливаем файл ---
  const put = await fetch(url, {
    method: "PUT",
    body: new Uint8Array(bytes),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error) => {
    throw new DetectorError("файл не залился", String(error).slice(0, 200));
  });
  if (!put.ok) throw new DetectorError(`файл не залился (${put.status})`);

  // --- 3. ждём разбор ---
  for (let attempt = 0; attempt < POLL_LIMIT; attempt += 1) {
    await sleep(POLL_EVERY_MS);

    const reply = await fetch(`${BASE}/api/media/users/${requestId}`, {
      headers: head(creds),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch(() => null);
    if (!reply || !reply.ok) continue;

    const detail = (await reply.json().catch(() => null)) as Detail | null;
    if (!detail) continue;

    const state = detail.resultsSummary?.status ?? detail.status;
    if (!state || state === "ANALYZING" || state === "PROCESSING") continue;

    const score = detail.resultsSummary?.metadata?.finalScore;
    return {
      // У них шкала в процентах, у нас доля — приводим к одному виду.
      score: typeof score === "number" ? score / 100 : null,
      generator: null,
      raw: detail,
      latencyMs: Date.now() - started,
    };
  }

  throw new DetectorError(
    `разбор не закончился за ${(POLL_LIMIT * POLL_EVERY_MS) / 1000} секунд`,
  );
}

export const realityDefender: Detector = {
  probe: (creds) => ask(creds, TINY_PNG, "image/png"),
  detect: (creds, bytes, mime) => ask(creds, bytes, mime),
};
