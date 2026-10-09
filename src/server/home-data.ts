import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { newsKey, samePublisher, splitPublisher } from "./news-data";
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

/** Сколько сообщений пришло всего — то же число, что в «Аналитике». */
const countReceived = () => db.report.count();

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
 * Сколько дней занимает проверка.
 *
 * Считаем по последним десяти рассмотренным, а не по всем за всё время, и
 * берём середину ряда, а не среднее. Причина простая: среднее по всем
 * случаям перестаёт меняться почти сразу — одна быстрая проверка сдвигает
 * его на сотые доли, и число на главной выглядит застрявшим. Середина
 * последних десяти отвечает на вопрос, который человек и задаёт: сколько
 * ждать, если написать сейчас.
 *
 * Одиночный долгий случай ряд не перекашивает: середина устойчивее
 * среднего. null, пока рассмотренных меньше трёх: по двум говорить о сроке
 * нельзя.
 */
const RECENT_REVIEWS = 10;

async function reviewDaysMedian(): Promise<number | null> {
  const rows = await db.report.findMany({
    where: { ...CONFIRMED, reviewedAt: { not: null } },
    orderBy: { reviewedAt: "desc" },
    take: RECENT_REVIEWS,
    select: { createdAt: true, reviewedAt: true },
  });

  if (rows.length < 3) return null;

  const days = rows
    .map((row) => (row.reviewedAt!.getTime() - row.createdAt.getTime()) / 86_400_000)
    .sort((first, second) => first - second);

  const middle = Math.floor(days.length / 2);
  const median =
    days.length % 2 === 1 ? days[middle] : (days[middle - 1] + days[middle]) / 2;

  // Меньше суток округлилось бы в ноль, а «проверяем за 0 дней» — неправда
  // даже когда приятная.
  return Math.max(1, Math.round(median));
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
      const key = newsKey(item.title);
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
        source: parsed.publisher ?? samePublisher(item.source),
        publishedAt: item.publishedAt,
      };
    });
}

export type HomeData = {
  caseCount: number;
  /** Все сообщения, включая непроверенные и отклонённые. */
  receivedCount: number;
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
  const [caseCount, receivedCount, recentCount, reviewDays, newsCount, sourceCount, types, cases, news] =
    await Promise.all([
      countCases(),
      countReceived(),
      countRecent(),
      reviewDaysMedian(),
      countNews(),
      countSources(),
      loadViolationTypes(),
      loadCases(CASES_ON_PAGE),
      loadNews(NEWS_ON_PAGE),
    ]);

  return {
    caseCount,
    receivedCount,
    recentCount,
    reviewDays,
    newsCount,
    sourceCount,
    types,
    cases,
    news,
  };
}
