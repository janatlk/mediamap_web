import { mlServiceUrl } from "./ml-service";

/*
  Разбор происхождения изображения: нарисовано моделью или снято.

  Здесь только HTTP до ML-сервиса — вся работа там, в mediamap_ml/provenance.
  Там же написано, почему в этом разборе нет «детектора ИИ» и не будет:
  сети, берущиеся отличить сгенерированное от снятого по самой картинке,
  на скриншотах из соцсетей ошибаются почти наугад, а именно скриншоты к
  нам и приходят.

  Ответ говорит только то, что нашли в файле: подпись происхождения, след
  генератора, след камеры. «Сказать нечего» — полноценный ответ и, судя по
  тому, что люди присылают, самый частый.
*/

/** Что удалось установить. Совпадает со словарём ML-сервиса. */
export type Origin =
  | "ai"
  | "camera"
  | "mixed"
  | "screen"
  | "signed"
  | "unknown";

export type Evidence = {
  layer: string;
  detail: string;
  /** decisive — закрывает вопрос; strong — веский довод; weak — к сведению. */
  weight: "decisive" | "strong" | "weak";
};

export type Observation = {
  where: string;
  what: string;
};

export type ProvenanceResult = {
  origin: Origin;
  headline: string;
  explain: string;
  signed: boolean;
  generator: string | null;
  camera: Record<string, string> | null;
  evidence: Evidence[];
  observations: Observation[];
  /**
   * Спрашивали ли модель.
   *
   * Разница существенная: пустой список при false значит «не спрашивали», при
   * true — «модель посмотрела и ничего не отметила». Второе само по себе
   * сведение, и путать его с первым нельзя.
   */
  observationsAsked: boolean;
  latencyMs: number;
};

/*
  Разбор метаданных занимает миллисекунды, а вот наблюдения модели — это
  запрос к ней, и он идёт секунды. Потолок общий с остальными обращениями
  к сервису, но со своим значением по умолчанию: тут нет ни скачивания
  медиа, ни расшифровки речи.
*/
function timeout(): number {
  const raw = Number(process.env.PROVENANCE_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
}

export function provenanceEnabled(): boolean {
  return mlServiceUrl().length > 0;
}

/**
 * Спрашивает ML-сервис о происхождении файла.
 *
 * Бросает при любой неудаче: молча вернуть «сказать нечего» нельзя — тогда
 * упавший сервис выглядел бы как добросовестный ответ «следов не нашли», а
 * это разные вещи.
 */
export async function examineImage(
  bytes: Buffer,
  mime: string,
  options: { observe?: boolean } = {},
): Promise<ProvenanceResult> {
  const base = mlServiceUrl();
  if (!base) throw new Error("ML_SERVICE_URL не задан");

  const response = await fetch(`${base}/provenance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_base64: bytes.toString("base64"),
      image_mime: mime,
      observe: options.observe ?? true,
    }),
    signal: AbortSignal.timeout(timeout()),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`сервис ответил ${response.status}: ${text.slice(0, 200)}`);
  }

  const body = (await response.json()) as {
    origin: string;
    headline: string;
    explain: string;
    signed: boolean;
    generator: string | null;
    camera: Record<string, string> | null;
    evidence: Evidence[];
    observations: Observation[];
    observations_asked: boolean;
    latency_ms: number;
  };

  return {
    origin: body.origin as Origin,
    headline: body.headline,
    explain: body.explain,
    signed: body.signed,
    generator: body.generator,
    camera: body.camera,
    evidence: body.evidence ?? [],
    observations: body.observations ?? [],
    observationsAsked: body.observations_asked ?? false,
    latencyMs: body.latency_ms ?? 0,
  };
}
