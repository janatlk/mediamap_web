import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";

/*
  Цифры для страницы «Контроль ИИ».

  Смысл страницы один: показать, можно ли этой оценке верить. Поэтому считаем
  не только «сколько чего разобрано», а три неудобные вещи — как часто сервис
  не отвечает, совпадает ли его вывод с решением живого проверяющего и
  оправдана ли его уверенность.

  Всё считается по журналу ai_checks, а не по полям в Report: там лежит
  последняя оценка, а история отказов и задержек — только здесь.
*/

/** Сколько дней показываем по умолчанию. */
export const DEFAULT_DAYS = 30;

export type Totals = {
  checks: number;
  byModel: number;
  byRules: number;
  failures: number;
  /** Доля отказов среди попыток обратиться к модели, 0…1. */
  failureRate: number;
};

export type Latency = {
  median: number;
  p95: number;
  max: number;
};

export type Bucket = {
  label: string;
  count: number;
};

/**
 * Совпадение с решением проверяющего.
 *
 * Единственная честная проверка качества, которая у нас есть: человек
 * посмотрел сообщение и оставил вид или сменил его. Считаем только по
 * рассмотренным — у ожидающих проверки сравнивать не с чем.
 */
export type Agreement = {
  reviewed: number;
  matched: number;
  /** Модель сказала «непонятно», а нарушение подтвердили. */
  missed: number;
  /** Модель назвала вид, а сообщение отклонили. */
  falseAlarms: number;
};

/** Оправдана ли уверенность: по корзинам от 0 до 100%. */
export type Calibration = {
  range: string;
  checks: number;
  approved: number;
  /** Доля подтверждённых в корзине, 0…1. Пусто, если сравнивать не с чем. */
  rate: number | null;
};

export type Failure = {
  id: number;
  error: string;
  createdAt: Date;
  latencyMs: number | null;
};

export type FactChecks = {
  withClaim: number;
  byVerdict: Bucket[];
  withSources: number;
};

export type Analytics = {
  days: number;
  totals: Totals;
  latency: Latency;
  verdicts: Bucket[];
  sublabels: Bucket[];
  acts: Bucket[];
  agreement: Agreement;
  calibration: Calibration[];
  factChecks: FactChecks;
  failures: Failure[];
  daily: { day: string; checks: number; failures: number }[];
  models: Bucket[];
};

type CheckRow = {
  id: number;
  reportId: number | null;
  source: string;
  model: string | null;
  verdict: string | null;
  confidence: number | null;
  sublabel: string | null;
  act: string | null;
  claim: string | null;
  factVerdict: string | null;
  sources: string | null;
  chosenType: string | null;
  latencyMs: number | null;
  ok: boolean;
  error: string | null;
  createdAt: Date;
};

export async function loadAnalytics(days = DEFAULT_DAYS): Promise<Analytics> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const checks = (await db.aiCheck.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  })) as CheckRow[];

  const reports = await loadReviewed(checks);

  return {
    days,
    totals: totals(checks),
    latency: latency(checks),
    verdicts: countBy(checks, (row) => row.verdict),
    sublabels: countBy(checks, (row) => row.sublabel),
    acts: countBy(checks, (row) => row.act),
    models: countBy(checks, (row) => row.model),
    agreement: agreement(checks, reports),
    calibration: calibration(checks, reports),
    factChecks: factChecks(checks),
    failures: failures(checks),
    daily: daily(checks),
  };
}

/** Итоги по рассмотренным сообщениям — чтобы сверять оценку с человеком. */
type Reviewed = Map<number, { status: string; typeSlug: string }>;

async function loadReviewed(checks: CheckRow[]): Promise<Reviewed> {
  const ids = checks.map((row) => row.reportId).filter((id): id is number => id !== null);
  if (!ids.length) return new Map();

  const rows = await db.report.findMany({
    where: { id: { in: ids }, status: { not: REPORT_STATUS.PENDING } },
    select: { id: true, status: true, violationType: { select: { slug: true } } },
  });

  return new Map(
    rows.map((row) => [row.id, { status: row.status, typeSlug: row.violationType.slug }]),
  );
}

function totals(checks: CheckRow[]): Totals {
  const byModel = checks.filter((row) => row.source === "model").length;
  const failures = checks.filter((row) => !row.ok).length;
  // Отказ — это неудачная попытка сходить в модель. Знаменатель тот же:
  // строки, где модель отвечала или должна была ответить.
  const attempts = byModel + failures;

  return {
    checks: checks.length,
    byModel,
    byRules: checks.filter((row) => row.source === "rules" && row.ok).length,
    failures,
    failureRate: attempts ? failures / attempts : 0,
  };
}

function latency(checks: CheckRow[]): Latency {
  const values = checks
    .map((row) => row.latencyMs)
    .filter((value): value is number => typeof value === "number" && value > 0)
    .sort((a, b) => a - b);

  if (!values.length) return { median: 0, p95: 0, max: 0 };

  return {
    median: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    max: values[values.length - 1],
  };
}

function percentile(sorted: number[], share: number): number {
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * share));
  return sorted[index];
}

function countBy(checks: CheckRow[], pick: (row: CheckRow) => string | null): Bucket[] {
  const counts = new Map<string, number>();
  for (const row of checks) {
    const key = pick(row);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function agreement(checks: CheckRow[], reports: Reviewed): Agreement {
  let reviewed = 0;
  let matched = 0;
  let missed = 0;
  let falseAlarms = 0;

  for (const row of checks) {
    if (!row.ok || row.reportId === null) continue;
    const report = reports.get(row.reportId);
    if (!report) continue;

    reviewed += 1;
    const approved = report.status === REPORT_STATUS.APPROVED;
    const namedType = row.verdict !== null && row.verdict !== "unclear";

    if (approved && row.verdict === report.typeSlug) matched += 1;
    if (approved && !namedType) missed += 1;
    if (!approved && namedType) falseAlarms += 1;
  }

  return { reviewed, matched, missed, falseAlarms };
}

const BANDS = [
  { range: "0–20%", from: 0, to: 0.2 },
  { range: "20–40%", from: 0.2, to: 0.4 },
  { range: "40–60%", from: 0.4, to: 0.6 },
  { range: "60–80%", from: 0.6, to: 0.8 },
  { range: "80–100%", from: 0.8, to: 1.01 },
];

function calibration(checks: CheckRow[], reports: Reviewed): Calibration[] {
  return BANDS.map((band) => {
    let count = 0;
    let approved = 0;

    for (const row of checks) {
      if (row.confidence === null || row.reportId === null) continue;
      if (row.confidence < band.from || row.confidence >= band.to) continue;
      const report = reports.get(row.reportId);
      if (!report) continue;

      count += 1;
      if (report.status === REPORT_STATUS.APPROVED) approved += 1;
    }

    return {
      range: band.range,
      checks: count,
      approved,
      rate: count ? approved / count : null,
    };
  });
}

function factChecks(checks: CheckRow[]): FactChecks {
  const withClaim = checks.filter((row) => row.claim).length;
  return {
    withClaim,
    byVerdict: countBy(checks, (row) => row.factVerdict),
    withSources: checks.filter((row) => row.sources).length,
  };
}

function failures(checks: CheckRow[]): Failure[] {
  return checks
    .filter((row) => !row.ok)
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      error: row.error ?? "без описания",
      createdAt: row.createdAt,
      latencyMs: row.latencyMs,
    }));
}

function daily(checks: CheckRow[]): { day: string; checks: number; failures: number }[] {
  const days = new Map<string, { checks: number; failures: number }>();

  for (const row of checks) {
    const day = row.createdAt.toISOString().slice(0, 10);
    const cell = days.get(day) ?? { checks: 0, failures: 0 };
    cell.checks += 1;
    if (!row.ok) cell.failures += 1;
    days.set(day, cell);
  }

  return [...days.entries()]
    .map(([day, cell]) => ({ day, ...cell }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
