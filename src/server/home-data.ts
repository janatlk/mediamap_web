import { db } from "@/lib/db";
import { hostFromUrl } from "@/lib/format";

/**
 * Данные для главной страницы.
 *
 * Каждая функция отвечает за один вопрос и ничего не форматирует —
 * оформление живёт в компонентах. Собирает их всех getHomeData.
 */

const CONFIRMED = { status: "APPROVED" } as const;

export type CaseRow = {
  id: number;
  publicId: string;
  typeName: { ru: string; ky: string };
  typeSlug: string;
  source: string | null;
  city: string;
  checkedAt: Date;
};

export type TypeRow = {
  slug: string;
  name: { ru: string; ky: string };
  description: { ru: string; ky: string };
  count: number;
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

/** Виды нарушений вместе с числом подтверждённых случаев. */
async function loadTypes(): Promise<TypeRow[]> {
  const types = await db.violationType.findMany({
    orderBy: { sort: "asc" },
    include: { _count: { select: { reports: { where: CONFIRMED } } } },
  });

  return types.map((type) => ({
    slug: type.slug,
    name: { ru: type.nameRu, ky: type.nameKy },
    description: { ru: type.descRu, ky: type.descKy },
    count: type._count.reports,
  }));
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
    typeSlug: row.violationType.slug,
    typeName: { ru: row.violationType.nameRu, ky: row.violationType.nameKy },
    source: hostFromUrl(row.mediaLink),
    city: row.city,
    checkedAt: row.createdAt,
  }));
}

/**
 * Сколько разных площадок попало в наблюдение.
 *
 * Считаем по домену: три ссылки на facebook.com — это одна площадка,
 * а не три.
 */
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

/**
 * Новости на языке сайта, без повторов.
 *
 * Англоязычные ленты обновляются чаще, и сортировка по дате выносила их
 * наверх — для русско-кыргызской аудитории это стена нечитаемого текста.
 * Свои идут первыми; если их не набралось, добираем остальными, потому
 * что пустой раздел хуже раздела с чужим языком.
 *
 * Один материал приходит из разных лент под разными идентификаторами,
 * поэтому повторы отсеиваем по заголовку, а не по ссылке.
 */
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
    .map((item) => ({
      id: item.id,
      title: item.title,
      link: item.link,
      source: item.source,
      publishedAt: item.publishedAt,
    }));
}

export type HomeData = {
  caseCount: number;
  newsCount: number;
  sourceCount: number;
  types: TypeRow[];
  cases: CaseRow[];
  news: NewsRow[];
};

const CASES_ON_PAGE = 8;
const NEWS_ON_PAGE = 5;

export async function getHomeData(): Promise<HomeData> {
  const [caseCount, newsCount, sourceCount, types, cases, news] =
    await Promise.all([
      countCases(),
      countNews(),
      countSources(),
      loadTypes(),
      loadCases(CASES_ON_PAGE),
      loadNews(NEWS_ON_PAGE),
    ]);

  return { caseCount, newsCount, sourceCount, types, cases, news };
}
