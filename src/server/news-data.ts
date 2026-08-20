import { db } from "@/lib/db";
import { decodeEntities } from "@/lib/format";

// Лента новостей. Собирается кроном из чужих RSS, поэтому здесь только
// чтение и приведение к виду, годному для показа.

export type NewsRow = {
  id: number;
  title: string;
  link: string;
  snippet: string | null;
  source: string;
  publishedAt: Date;
};

export const PER_PAGE = 20;

/** Есть ли в строке кириллица. */
const isCyrillic = (text: string) => /[Ѐ-ӿ]/.test(text);

export type NewsPage = {
  items: NewsRow[];
  total: number;
  page: number;
  pageCount: number;
  /** Сколько материалов скрыто отбором по языку. */
  hiddenByLanguage: number;
};

/**
 * Страница ленты.
 *
 * Отбор по языку делаем в коде, а не запросом: SQLite не умеет регулярные
 * выражения без расширения, а лента маленькая — тянуть её целиком дешевле,
 * чем городить хранимую колонку с языком.
 *
 * Повторы ловим по заголовку: один материал приходит из разных лент под
 * разными идентификаторами и с разными ссылками.
 */
export async function loadNewsPage(
  requestedPage: number,
  showAllLanguages: boolean,
): Promise<NewsPage> {
  const all = await db.newsItem.findMany({ orderBy: { publishedAt: "desc" } });

  const seen = new Set<string>();
  const unique = all.filter((item) => {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const readable = unique.filter((item) => isCyrillic(item.title));
  const shown = showAllLanguages ? unique : readable;

  const total = shown.length;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const from = (page - 1) * PER_PAGE;

  return {
    items: shown.slice(from, from + PER_PAGE).map((item) => ({
      id: item.id,
      title: decodeEntities(item.title),
      link: item.link,
      snippet: item.snippet ? decodeEntities(item.snippet) : null,
      source: item.source,
      publishedAt: item.publishedAt,
    })),
    total,
    page,
    pageCount,
    hiddenByLanguage: unique.length - readable.length,
  };
}
