import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { hostFromUrl } from "@/lib/format";

/*
  Числа для открытого раздела «Аналитика».

  Считаем по всем сообщениям, включая непроверенные, — так решено проектом.
  Это важное решение, и молчать о нём нельзя: непроверенное сообщение это
  заявка человека, а не установленный факт, и часть таких заявок после
  проверки отсеивается. Поэтому рядом с каждым числом раздел показывает,
  сколько из него подтверждено, а на странице стоит оговорка.

  Личных данных заявителей тут нет и быть не может: наружу идут только
  количества, вид нарушения, месяц, домен площадки и область.
*/

const MONTHS = 12;

export type TypeSlice = {
  slug: string;
  total: number;
  confirmed: number;
  /** Доля от всех сообщений, 0-100. */
  share: number;
};

export type MonthPoint = {
  /** Начало месяца — форматирует страница, ей виднее про язык. */
  month: Date;
  total: number;
};

export type TypeTrend = {
  slug: string;
  points: MonthPoint[];
};

export type NamedCount = { name: string | null; total: number };

export type PublicAnalytics = {
  total: number;
  confirmed: number;
  types: TypeSlice[];
  trends: TypeTrend[];
  /** Общий потолок для всех трёх графиков динамики. */
  trendMax: number;
  sources: NamedCount[];
  regions: NamedCount[];
};

/** Первое число месяца, в котором лежит дата. Считаем по UTC — как хранит база. */
const monthStart = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const TOP_SOURCES = 8;

export async function getPublicAnalytics(): Promise<PublicAnalytics> {
  const rows = await db.report.findMany({
    select: {
      status: true,
      regionCode: true,
      mediaLink: true,
      createdAt: true,
      violationType: { select: { slug: true } },
    },
  });

  const total = rows.length;
  const confirmed = rows.filter(
    (row) => row.status === REPORT_STATUS.APPROVED,
  ).length;

  // --- по видам ---
  const byType = new Map<string, { total: number; confirmed: number }>();
  for (const row of rows) {
    const slug = row.violationType.slug;
    const cell = byType.get(slug) ?? { total: 0, confirmed: 0 };
    cell.total += 1;
    if (row.status === REPORT_STATUS.APPROVED) cell.confirmed += 1;
    byType.set(slug, cell);
  }

  const types: TypeSlice[] = [...byType.entries()]
    .map(([slug, cell]) => ({
      slug,
      total: cell.total,
      confirmed: cell.confirmed,
      share: total > 0 ? Math.round((cell.total / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  /*
    --- динамика по месяцам ---

    Год отсчитывается от последнего сообщения, а не от сегодняшнего дня.
    На стенде данные заливаются разом и потом лежат: от сегодняшнего числа
    все двенадцать столбиков вышли бы пустыми, и раздел выглядел бы
    сломанным, хотя данные есть.
  */
  const latest = rows.reduce<Date | null>(
    (max, row) => (!max || row.createdAt > max ? row.createdAt : max),
    null,
  );

  const months: Date[] = [];
  if (latest) {
    const end = monthStart(latest);
    for (let back = MONTHS - 1; back >= 0; back -= 1) {
      months.push(
        new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - back, 1)),
      );
    }
  }

  const key = (slug: string, month: Date) => `${slug}:${month.getTime()}`;
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row.violationType.slug, monthStart(row.createdAt));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const trends: TypeTrend[] = types.map((type) => ({
    slug: type.slug,
    points: months.map((month) => ({
      month,
      total: counts.get(key(type.slug, month)) ?? 0,
    })),
  }));

  /*
    Шкала у всех графиков общая. С отдельными шкалами три картинки выглядели
    бы одинаково при трёх разных числах — а именно их и сравнивают глазами.
  */
  const trendMax = Math.max(
    1,
    ...trends.flatMap((trend) => trend.points.map((point) => point.total)),
  );

  // --- площадки ---
  const bySource = new Map<string, number>();
  for (const row of rows) {
    // Считаем по домену: три ссылки на facebook.com — одна площадка.
    const host = row.mediaLink ? hostFromUrl(row.mediaLink) : null;
    if (!host) continue;
    bySource.set(host, (bySource.get(host) ?? 0) + 1);
  }

  const sources: NamedCount[] = [...bySource.entries()]
    .map(([name, count]) => ({ name, total: count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_SOURCES);

  // --- области ---
  const byRegion = new Map<string | null, number>();
  for (const row of rows) {
    const code = row.regionCode ?? null;
    byRegion.set(code, (byRegion.get(code) ?? 0) + 1);
  }

  const regions: NamedCount[] = [...byRegion.entries()]
    .map(([name, count]) => ({ name, total: count }))
    .sort((a, b) => b.total - a.total);

  return { total, confirmed, types, trends, trendMax, sources, regions };
}
