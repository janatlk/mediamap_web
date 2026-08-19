import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { loadViolationTypes, type ViolationType } from "./violations";
import { hostFromUrl } from "@/lib/format";

// Всё, что главная просит у базы. Одна функция — один вопрос,
// форматирование не здесь, а в компонентах.

const CONFIRMED = { status: REPORT_STATUS.APPROVED };

export type CaseRow = {
  id: number;
  publicId: string;
  typeName: { ru: string; ky: string };
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
  types: ViolationType[];
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
      loadViolationTypes(),
      loadCases(CASES_ON_PAGE),
      loadNews(NEWS_ON_PAGE),
    ]);

  return { caseCount, newsCount, sourceCount, types, cases, news };
}
