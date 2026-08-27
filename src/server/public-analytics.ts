import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { hostFromUrl } from "@/lib/format";
import { loadViolationTypes, type ViolationType } from "./violations";

/*
  Цифры для публичной страницы «Аналитика».

  Считаем только подтверждённые сообщения — то же условие, что и у списка
  случаев. Ожидающие проверки и отклонённые наружу не идут: пока человек не
  посмотрел, это не данные, а очередь, и публиковать её значит выдавать
  непроверенные обвинения за статистику.

  Всё считается в коде, а не запросами с группировкой. Причина та же, что и
  у ленты новостей: база у нас SQLite, подтверждённых сообщений сотни, и
  вытащить их одним запросом дешевле, чем городить группировку, которую
  придётся переписывать при переезде на Postgres.
*/

const CONFIRMED = { status: REPORT_STATUS.APPROVED };

/** Сколько месяцев показываем в динамике. */
export const TREND_MONTHS = 12;

/** Сколько площадок и областей показываем в списках. */
const TOP_LIMIT = 8;

export type MonthPoint = {
  /** Первое число месяца — из него берётся подпись на нужном языке. */
  month: Date;
  /** Сколько случаев этого вида в этом месяце. */
  counts: Record<string, number>;
  total: number;
};

export type RankedItem = {
  /** Домен площадки или код области. */
  key: string;
  count: number;
};

export type PublicAnalytics = {
  total: number;
  types: ViolationType[];
  /** Помесячно, от старого к новому. Пустые месяцы внутри ряда сохраняются. */
  trend: MonthPoint[];
  /** Наибольшее число случаев в одном месяце — общая шкала для всех видов. */
  trendPeak: number;
  sources: RankedItem[];
  sourceCount: number;
  regions: RankedItem[];
  /** Сколько случаев без области: показываем честно, а не прячем. */
  withoutRegion: number;
  /** Дата самого раннего подтверждённого случая. Пусто, если их нет. */
  since: Date | null;
};

/** Первое число месяца, в котором лежит дата. Время — по Бишкеку. */
function monthStart(date: Date): Date {
  // Смещение прибито гвоздями по той же причине, что и в format.ts: сервер
  // может стоять в UTC, и случай, заведённый вечером, уехал бы в прошлый
  // месяц. У Кыргызстана перевода часов нет, +6 круглый год.
  const shifted = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1));
}

/**
 * Ряд из N месяцев подряд, кончающийся указанным месяцем. Пустые месяцы
 * внутри ряда сохраняются: провал в середине — это тоже данные.
 */
function monthsUpTo(last: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) =>
    new Date(
      Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - (count - 1 - index), 1),
    ),
  );
}

/** Считает, сколько раз встретился каждый ключ, и сортирует по убыванию. */
function rank(keys: (string | null)[], limit: number): RankedItem[] {
  const counts = new Map<string, number>();
  for (const key of keys) {
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    // При равном числе — по алфавиту: иначе порядок скачет от запроса к
    // запросу и страница выглядит так, будто данные меняются сами.
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export async function getPublicAnalytics(): Promise<PublicAnalytics> {
  const [types, rows] = await Promise.all([
    loadViolationTypes(),
    db.report.findMany({
      where: CONFIRMED,
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        regionCode: true,
        mediaLink: true,
        violationType: { select: { slug: true } },
      },
    }),
  ]);

  const byMonth = new Map<number, Record<string, number>>();
  for (const row of rows) {
    const key = monthStart(row.createdAt).getTime();
    const bucket = byMonth.get(key) ?? {};
    const slug = row.violationType.slug;
    bucket[slug] = (bucket[slug] ?? 0) + 1;
    byMonth.set(key, bucket);
  }

  /*
    Год отсчитываем от последнего случая, а не от сегодняшнего дня.

    От сегодняшнего было бы вернее по смыслу, но на деле давало пустой
    раздел: проверка идёт неделями, и в базе, куда давно не добавляли,
    все двенадцать столбиков оказывались нулевыми. Пустой график читается
    как «сломалось», а не как «за год ничего не было». Поэтому показываем
    последний год, в котором есть что показать, и подписываем его границы.
  */
  const lastMonth = monthStart(rows.at(-1)?.createdAt ?? new Date());

  const trend = monthsUpTo(lastMonth, TREND_MONTHS).map((month) => {
    const counts = byMonth.get(month.getTime()) ?? {};
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return { month, counts, total };
  });

  /*
    Шкала одна на все виды и берётся по самому высокому столбику любого вида,
    а не по сумме за месяц. Своя шкала у каждого вида врала бы: три графика
    одинаковой высоты означали бы три разных числа.
  */
  const trendPeak = Math.max(
    1,
    ...trend.flatMap((point) => Object.values(point.counts)),
  );

  const hosts = rows.map((row) => hostFromUrl(row.mediaLink));

  return {
    total: rows.length,
    types,
    trend,
    trendPeak,
    sources: rank(hosts, TOP_LIMIT),
    sourceCount: new Set(hosts.filter(Boolean)).size,
    regions: rank(rows.map((row) => row.regionCode), TOP_LIMIT),
    withoutRegion: rows.filter((row) => !row.regionCode).length,
    since: rows[0]?.createdAt ?? null,
  };
}
