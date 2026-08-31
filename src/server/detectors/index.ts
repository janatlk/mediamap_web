import { db } from "@/lib/db";
import { open, seal } from "@/lib/secret-box";
import { hive } from "./hive";
import { realityDefender } from "./reality-defender";
import { sightengine } from "./sightengine";
import { DetectorError, type Credentials, type Detector } from "./types";

export * from "./types";

/*
  Кто чем разбирается. Ключ совпадает с id из src/lib/detectors.ts —
  реестр описывает сервис словами, здесь лежит запрос к нему.
*/
const ADAPTERS: Record<string, Detector> = {
  sightengine,
  hive,
  "reality-defender": realityDefender,
};

export const adapterFor = (id: string): Detector | undefined => ADAPTERS[id];

export type StoredKey = {
  service: string;
  creds: Credentials | null;
  /** Не расшифровался: сменили SECRETS_KEY или запись побилась. */
  broken: boolean;
  enabled: boolean;
  lastCheckedAt: Date | null;
  lastStatus: string | null;
  lastError: string | null;
  lastLatencyMs: number | null;
};

/**
 * Все заведённые ключи.
 *
 * Нерасшифрованное не бросает, а помечается broken. Один испорченный ключ
 * не должен закрывать страницу, на которой его и надо заменить.
 */
export async function loadKeys(): Promise<StoredKey[]> {
  const rows = await db.serviceKey.findMany();

  return rows.map((row) => {
    let creds: Credentials | null = null;
    let broken = false;
    try {
      creds = JSON.parse(open(row.secret)) as Credentials;
    } catch {
      broken = true;
    }
    return {
      service: row.service,
      creds,
      broken,
      enabled: row.enabled,
      lastCheckedAt: row.lastCheckedAt,
      lastStatus: row.lastStatus,
      lastError: row.lastError,
      lastLatencyMs: row.lastLatencyMs,
    };
  });
}

export async function saveKey(service: string, creds: Credentials): Promise<void> {
  const secret = seal(JSON.stringify(creds));
  await db.serviceKey.upsert({
    where: { service },
    create: { service, secret },
    // Ключ сменили — прошлый след проверки к нему уже не относится.
    update: {
      secret,
      lastCheckedAt: null,
      lastStatus: null,
      lastError: null,
      lastLatencyMs: null,
    },
  });
}

export async function removeKey(service: string): Promise<void> {
  await db.serviceKey.deleteMany({ where: { service } });
}

export async function setEnabled(service: string, enabled: boolean): Promise<void> {
  await db.serviceKey.updateMany({ where: { service }, data: { enabled } });
}

export type ProbeResult = { ok: boolean; latencyMs: number; error?: string };

/**
 * Живая проверка ключа.
 *
 * Настоящий запрос к сервису самой маленькой картинкой. Разобрать ключ по
 * виду строки нельзя — «выглядит правильно» и «работает» это разные вещи,
 * а узнать вторую можно только спросив.
 */
export async function probeKey(service: string): Promise<ProbeResult> {
  const adapter = adapterFor(service);
  if (!adapter) return { ok: false, latencyMs: 0, error: "нет переходника" };

  const stored = (await loadKeys()).find((item) => item.service === service);
  if (!stored) return { ok: false, latencyMs: 0, error: "ключ не заведён" };
  if (stored.broken || !stored.creds) {
    return { ok: false, latencyMs: 0, error: "ключ не расшифровывается" };
  }

  const started = Date.now();
  try {
    const answer = await adapter.probe(stored.creds);
    await remember(service, "ok", null, answer.latencyMs);
    return { ok: true, latencyMs: answer.latencyMs };
  } catch (error) {
    const text =
      error instanceof DetectorError
        ? [error.message, error.detail].filter(Boolean).join(" — ")
        : String(error);
    const latency = Date.now() - started;
    await remember(service, "error", text.slice(0, 500), latency);
    return { ok: false, latencyMs: latency, error: text.slice(0, 500) };
  }
}

async function remember(
  service: string,
  status: string,
  error: string | null,
  latencyMs: number,
): Promise<void> {
  await db.serviceKey.updateMany({
    where: { service },
    data: { lastCheckedAt: new Date(), lastStatus: status, lastError: error, lastLatencyMs: latencyMs },
  });
}

export type Comparison = {
  service: string;
  ok: boolean;
  score: number | null;
  generator: string | null;
  latencyMs: number;
  error: string | null;
  raw: unknown;
};

/**
 * Прогоняет одну картинку через все включённые сервисы.
 *
 * Ради этого страница и заводится: числа из чужих бенчмарков к нашему
 * потоку отношения не имеют, а вот один и тот же скриншот, поданный трём
 * сервисам разом, показывает и расхождения между ними, и цену вопроса.
 *
 * Запросы идут разом: три последовательных ожидания по сорок пять секунд
 * человек в панели не высидит.
 */
export async function compareAll(
  bytes: Buffer,
  mime: string,
  /*
    Спросить один сервис вместо всех.

    Открытая страница проверки показывает ответ одного — и спрашивать
    остальные значит жечь чужую квоту ради числа, которого никто не увидит.
    В панели сравнение по-прежнему идёт по всем: там смысл именно в том,
    чтобы увидеть расхождение.
  */
  only?: string,
): Promise<Comparison[]> {
  const keys = (await loadKeys()).filter(
    (item) =>
      item.enabled &&
      !item.broken &&
      item.creds &&
      (only === undefined || item.service === only),
  );

  return Promise.all(
    keys.map(async (key) => {
      const adapter = adapterFor(key.service);
      if (!adapter) {
        return {
          service: key.service,
          ok: false,
          score: null,
          generator: null,
          latencyMs: 0,
          error: "нет переходника",
          raw: null,
        };
      }

      const started = Date.now();
      try {
        const answer = await adapter.detect(key.creds!, bytes, mime);
        return {
          service: key.service,
          ok: true,
          score: answer.score,
          generator: answer.generator,
          latencyMs: answer.latencyMs,
          error: null,
          raw: answer.raw,
        };
      } catch (error) {
        const text =
          error instanceof DetectorError
            ? [error.message, error.detail].filter(Boolean).join(" — ")
            : String(error);
        return {
          service: key.service,
          ok: false,
          score: null,
          generator: null,
          latencyMs: Date.now() - started,
          error: text.slice(0, 500),
          raw: null,
        };
      }
    }),
  );
}
