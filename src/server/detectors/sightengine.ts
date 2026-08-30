import {
  DetectorError,
  TIMEOUT_MS,
  TINY_PNG,
  type Credentials,
  type Detector,
  type DetectorAnswer,
} from "./types";

/*
  Sightengine.

  Один запрос, один ответ — самый простой из трёх. Ключ доступа это пара
  «пользователь и секрет», оба идут прямо в теле формы, а не в заголовке;
  так у них устроено.

  Ответ:
    { "status": "success",
      "type": { "ai_generated": 0.001,
                "ai_generators": { "midjourney": 0.0, "flux": 0.0, … } } }

  При отказе status = "failure" и рядом error.message — по нему и отличаем
  плохой ключ от плохого файла.
*/

const ENDPOINT = "https://api.sightengine.com/1.0/check.json";

type Reply = {
  status?: string;
  error?: { type?: string; code?: number; message?: string };
  request?: { operations?: number };
  type?: {
    ai_generated?: number;
    ai_generators?: Record<string, number>;
  };
};

/** Самый вероятный генератор из разбивки по генераторам. */
function pickGenerator(scores: Record<string, number> | undefined): string | null {
  if (!scores) return null;
  const best = Object.entries(scores)
    .filter(([name]) => name !== "other")
    .sort((a, b) => b[1] - a[1])[0];
  // Ниже половины называть генератор нельзя: там у них шум по всем строкам.
  return best && best[1] >= 0.5 ? best[0] : null;
}

async function ask(
  creds: Credentials,
  bytes: Buffer,
  mime: string,
): Promise<DetectorAnswer> {
  const started = Date.now();

  const form = new FormData();
  form.append("media", new Blob([new Uint8Array(bytes)], { type: mime }), "media");
  form.append("models", "genai");
  form.append("api_user", creds.api_user ?? "");
  form.append("api_secret", creds.api_secret ?? "");

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new DetectorError("сервис не ответил", String(error).slice(0, 200));
  }

  const body = (await response.json().catch(() => null)) as Reply | null;
  if (!body) throw new DetectorError("ответ не разобрался");

  if (body.status !== "success") {
    throw new DetectorError(
      body.error?.message ?? `сервис ответил ${response.status}`,
      body.error?.type,
    );
  }

  const score = body.type?.ai_generated;
  return {
    score: typeof score === "number" ? score : null,
    generator: pickGenerator(body.type?.ai_generators),
    raw: body,
    latencyMs: Date.now() - started,
  };
}

export const sightengine: Detector = {
  probe: (creds) => ask(creds, TINY_PNG, "image/png"),
  detect: (creds, bytes, mime) => ask(creds, bytes, mime),
};
