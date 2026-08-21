import { db } from "@/lib/db";
import { decodeEntities } from "@/lib/format";

// Лента новостей. Собирается кроном из чужих RSS, поэтому здесь только
// чтение и приведение к виду, годному для показа.

/*
  Подзаголовок из ленты сплошь и рядом начинается тем же заголовком —
  агрегаторы склеивают title и описание. На странице это выглядело как
  заикание: одна и та же фраза два раза подряд, только вторая мельче.

  Сравниваем по началу и без знаков препинания: у повтора обычно приклеен
  хвост вроде « RTVI», и посимвольное равенство его не поймает.
*/
const bare = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const usefulSnippet = (title: string, snippet: string | null): string | null => {
  if (!snippet) return null;
  const clean = decodeEntities(snippet);
  const head = bare(clean).slice(0, 60);
  return head && bare(decodeEntities(title)).startsWith(head) ? null : clean;
};

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
      snippet: usefulSnippet(item.title, item.snippet),
      source: item.source,
      publishedAt: item.publishedAt,
    })),
    total,
    page,
    pageCount,
    hiddenByLanguage: unique.length - readable.length,
  };
}
