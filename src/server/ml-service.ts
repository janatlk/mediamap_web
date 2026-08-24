import type { ViolationSlug } from "@/lib/i18n";

/*
  Обращение к ML-сервису — тому, что лежит в отдельном репозитории и умеет
  разбирать текст языковой моделью.

  Сайт не ходит в OpenAI напрямую и не хранит ключ от неё. Ключ один и живёт
  в ML-сервисе: так его меняют в одном месте, и так видно, кто и сколько
  потратил. Здесь только HTTP.

  Сервис может быть не поднят — это нормальное состояние, а не поломка.
  Тогда оценку снимает разбор по словам, и в aiSource остаётся "rules".
*/

/** Классы ML-сервиса. Совпадают по смыслу с видами на сайте, но не по имени. */
const CLASS_TO_SLUG: Record<string, ViolationSlug | "unclear"> = {
  hate_speech: "hate-speech",
  disinformation: "disinformation",
  scam: "digital-fraud",
  neutral: "unclear",
};

/**
 * Ответ модели про один вид нарушения.
 *
 * Нужен, чтобы отвечать заявителю на его собственный вопрос: вид он выбирает
 * сам, и на «дезинформацию» надо отвечать про дезинформацию. Общего вердикта
 * для этого мало — он говорит, что модель нашла, а не что она думает о том,
 * о чём спросили.
 */
export type TypeCheck = {
  found: boolean;
  confidence: number;
  explanation: string;
};

export type MlVerdict = {
  slug: ViolationSlug | "unclear";
  confidence: number;
  /** Направление вражды или подвид дезинформации: lgbt, health, … */
  sublabel: string | null;
  /** Тип акта для языка вражды: insult | discrimination | incitement. */
  act: string | null;
  /** Черновик заголовка случая; окончательный текст пишет проверяющий. */
  headline: string | null;
  /** Человеческое обоснование от модели. */
  explanation: string;
  /** Утверждение, которое должен проверить человек. */
  claim: string | null;
  requiresFactCheck: boolean;
  /** Итог проверки по источникам: true | false | unverified. */
  factVerdict: string | null;
  factSummary: string | null;
  sources: string[];
  /** Что именно считало: "llm-hate:gpt-5.6-luna + …". */
  modelVersion: string;
  /** Текст, извлечённый из ссылки или картинки. */
  extractedText: string | null;
  /*
    Что модель ответила по каждому виду в отдельности.

    Вида нет в списке — значит его не проверяли, и это не то же самое, что
    «не нашли». Своей проверки по цифровому мошенничеству у сервиса пока нет
    вовсе, и сказать про него «нарушения нет» было бы неправдой.
  */
  checks: Partial<Record<ViolationSlug, TypeCheck>>;
};

type ClassifyPayload = {
  content_type: "text" | "url" | "image";
  text?: string;
  url?: string;
  image_base64?: string;
  /** Тип картинки: без него сервис считает всё присланное как jpeg. */
  image_mime?: string;
  context?: string;
  source?: "moderator" | "user" | "auto";
};

/** Ответ сервиса. Поля перечислены не все — только те, что нам нужны. */
type ClassifyResponse = {
  label: string;
  sublabel: string | null;
  confidence: number;
  act: string | null;
  headline: string | null;
  explanation: string;
  claim: string | null;
  requires_fact_check: boolean;
  fact_verdict: string | null;
  fact_summary: string | null;
  sources: string[];
  model_version: string;
  extracted_text: string | null;
  checks?: Record<string, { found: boolean; confidence: number; explanation: string }>;
};

export function mlServiceUrl(): string {
  return (process.env.ML_SERVICE_URL ?? "").replace(/\/$/, "");
}

export function mlEnabled(): boolean {
  return mlServiceUrl().length > 0;
}

/**
 * Спрашивает ML-сервис.
 *
 * Бросает при любой неудаче — вызывающий решает, чем это заменить. Молча
 * возвращать «непонятно» нельзя: тогда сбой сервиса выглядел бы как
 * добросовестный ответ модели.
 */
export async function classify(payload: ClassifyPayload): Promise<MlVerdict> {
  const base = mlServiceUrl();
  if (!base) throw new Error("ML_SERVICE_URL не задан");

  const response = await fetch(`${base}/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "user", ...payload }),
    signal: AbortSignal.timeout(timeoutMs()),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`ML-сервис ответил ${response.status}`);
  }

  return toVerdict((await response.json()) as ClassifyResponse);
}

function toVerdict(body: ClassifyResponse): MlVerdict {
  return {
    slug: CLASS_TO_SLUG[body.label] ?? "unclear",
    confidence: clamp(body.confidence),
    sublabel: body.sublabel,
    act: body.act,
    headline: body.headline ?? null,
    explanation: body.explanation ?? "",
    claim: body.claim,
    requiresFactCheck: Boolean(body.requires_fact_check),
    factVerdict: body.fact_verdict,
    factSummary: body.fact_summary,
    sources: Array.isArray(body.sources) ? body.sources : [],
    modelVersion: body.model_version ?? "",
    extractedText: body.extracted_text,
    checks: toChecks(body.checks),
  };
}

/** Классы сервиса → виды сайта. Незнакомые молча пропускаем. */
function toChecks(raw: ClassifyResponse["checks"]): MlVerdict["checks"] {
  const checks: MlVerdict["checks"] = {};
  if (!raw) return checks;

  for (const [name, check] of Object.entries(raw)) {
    const slug = CLASS_TO_SLUG[name];
    if (!slug || slug === "unclear") continue;

    checks[slug] = {
      found: Boolean(check.found),
      confidence: clamp(check.confidence),
      explanation: check.explanation ?? "",
    };
  }

  return checks;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Ссылку сервис разбирает 20–30 секунд: качает медиа и расшифровывает речь.
 * Поэтому ждём долго — но не бесконечно, иначе человек смотрит на форму,
 * которая ничего не отвечает.
 */
function timeoutMs(): number {
  const raw = Number(process.env.ML_SERVICE_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 45_000;
}
