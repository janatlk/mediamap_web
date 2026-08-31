import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { splitPublisher } from "./news-data";
import { loadViolationTypes, type ViolationType } from "./violations";
import { decodeEntities, hostFromUrl } from "@/lib/format";

// Всё, что главная просит у базы. Одна функция — один вопрос,
// форматирование не здесь, а в компонентах.

const CONFIRMED = { status: REPORT_STATUS.APPROVED };

export type CaseRow = {
  id: number;
  publicId: string;
  /** Короткий заголовок случая. Пусто у старых записей — тогда показываем вид. */
  headline: string | null;
  typeSlug: string;
  source: string | null;
  city: string | null;
  checkedAt: Date;
};

export type NewsRow = {
  id: number;
  title: string;
  link: string;
  source: string;
  publishedAt: Date;
};

/** Сколько случаев подтверждено. */
const countCases = () => db.report.count({ where: CONFIRMED });

/** Сколько новостей собрано за всё время. */
const countNews = () => db.newsItem.count();

/** Сколько дней считаем «недавним». Месяц — привычная мерка. */
const RECENT_DAYS = 30;

/**
 * Подтверждено за последний месяц.
 *
 * Общий итог говорит «проект жил когда-то», месячный — «жив сейчас». Ради
 * этой разницы число и появилось: полоса из четырёх итогов за всё время не
 * менялась месяцами и потому ничего не сообщала.
 */
const countRecent = () =>
  db.report.count({
    where: {
      ...CONFIRMED,
      reviewedAt: { gte: new Date(Date.now() - RECENT_DAYS * 86_400_000) },
    },
  });

/**
 * Сколько дней в среднем проходит от подачи до решения.
 *
 * Это обещание, которое мы и так даём словами: на форме написано «обычно
 * несколько дней». Здесь то же самое числом — то есть проверяемо.
 *
 * null, пока рассмотренных меньше трёх: среднее по двум — не среднее, а
 * пересказ двух случаев, и первая же долгая проверка удвоит его.
 */
async function averageReviewDays(): Promise<number | null> {
  const rows = await db.report.findMany({
    where: { ...CONFIRMED, reviewedAt: { not: null } },
    select: { createdAt: true, reviewedAt: true },
  });

  if (rows.length < 3) return null;

  const days = rows.map(
    (row) => (row.reviewedAt!.getTime() - row.createdAt.getTime()) / 86_400_000,
  );
  const average = days.reduce((sum, value) => sum + value, 0) / days.length;

  // Меньше суток округлилось бы в ноль, а «проверяем за 0 дней» — неправда
  // даже когда приятная.
  return Math.max(1, Math.round(average));
}

/** Последние подтверждённые случаи. */
async function loadCases(limit: number): Promise<CaseRow[]> {
  const rows = await db.report.findMany({
    where: CONFIRMED,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { violationType: true },
  });

  return rows.map((row) => ({
    id: row.id,
    publicId: row.publicId,
    headline: row.headline,
    typeSlug: row.violationType.slug,
    source: hostFromUrl(row.mediaLink),
    city: row.city,
    checkedAt: row.createdAt,
  }));
}

// Считаем по домену: три ссылки на facebook.com — одна площадка, не три.
async function countSources(): Promise<number> {
  const rows = await db.report.findMany({
    where: CONFIRMED,
    select: { mediaLink: true },
  });

  const hosts = new Set(
    rows.map((row) => hostFromUrl(row.mediaLink)).filter(Boolean),
  );
  return hosts.size;
}

/** Есть ли в строке кириллица. */
const isCyrillic = (text: string) => /[Ѐ-ӿ]/.test(text);

// Англоязычные ленты обновляются чаще и по дате вылезали наверх — на
// русскоязычном сайте выходила стена нечитаемого. Сначала свои, потом
// добираем остальными: пустой раздел хуже чужого языка.
//
// Повторы ловим по заголовку: у перепечаток разные ссылки и guid.
async function loadNews(limit: number): Promise<NewsRow[]> {
  const pool = await db.newsItem.findMany({
    orderBy: { publishedAt: "desc" },
    take: 200,
  });

  const seen = new Set<string>();
  return [
    ...pool.filter((item) => isCyrillic(item.title)),
    ...pool.filter((item) => !isCyrillic(item.title)),
  ]
    .filter((item) => {
      const key = item.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map((item) => {
      // Разбор заголовка общий с лентой новостей — см. splitPublisher.
      const parsed = splitPublisher(decodeEntities(item.title));

      return {
        id: item.id,
        title: parsed.title,
        link: item.link,
        source: parsed.publisher ?? item.source,
        publishedAt: item.publishedAt,
      };
    });
}

export type HomeData = {
  caseCount: number;
  /** Подтверждено за последний месяц. */
  recentCount: number;
  /** Средний срок проверки в днях. null — рассмотренных ещё слишком мало. */
  reviewDays: number | null;
  newsCount: number;
  sourceCount: number;
  types: ViolationType[];
  cases: CaseRow[];
  news: NewsRow[];
};

const CASES_ON_PAGE = 8;
const NEWS_ON_PAGE = 5;

export async function getHomeData(): Promise<HomeData> {
  const [caseCount, recentCount, reviewDays, newsCount, sourceCount, types, cases, news] =
    await Promise.all([
      countCases(),
      countRecent(),
      averageReviewDays(),
      countNews(),
      countSources(),
      loadViolationTypes(),
      loadCases(CASES_ON_PAGE),
      loadNews(NEWS_ON_PAGE),
    ]);

  return {
    caseCount,
    recentCount,
    reviewDays,
    newsCount,
    sourceCount,
    types,
    cases,
    news,
  };
}
