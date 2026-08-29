import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { decodeEntities } from "@/lib/format";
import { getDictionary, type Lang } from "@/lib/i18n";
import { splitPublisher } from "./news-data";

/*
  Поиск по сайту: случаи, дайджест, виды нарушений, глоссарий.

  Ищем в памяти, а не запросом с LIKE, и на то есть причина. База у нас
  SQLite, и её LIKE приводит регистр только для латиницы: «Бишкек» и
  «бишкек» для неё разные слова. Prisma умеет mode: "insensitive", но на
  SQLite этот режим не поддерживается — молча ничего не делает.

  Поэтому строки вытаскиваются и сравниваются на стороне Node, где
  toLowerCase знает про кириллицу. Расплата — объём: берём только те
  колонки, которые показываем, и не больше SCAN_LIMIT записей на раздел.
  При нынешних сотнях записей это доли мегабайта.

  Когда дайджест разрастётся до десятков тысяч, отсюда надо будет уходить —
  либо в отдельную колонку с заранее приведённым текстом, либо в FTS5.
  Раньше этого времени усложнять незачем.
*/

const SCAN_LIMIT = 5000;
const PER_GROUP = 20;
export const MIN_QUERY = 2;

const fold = (text: string) => text.toLowerCase().replace(/ё/g, "е");

/** Есть ли запрос в тексте — без учёта регистра и различия е/ё. */
const hit = (needle: string, ...haystack: (string | null | undefined)[]) =>
  haystack.some((text) => text && fold(text).includes(needle));

export type SearchHit = {
  /** Куда вести. Уже с языком. */
  href: string;
  title: string;
  /** Вторая строка: подзаголовок, определение, площадка с датой. */
  note: string | null;
  /** Внешняя ссылка открывается в новой вкладке и помечается стрелкой. */
  external?: boolean;
};

export type SearchGroup = {
  id: "cases" | "news" | "types" | "glossary";
  hits: SearchHit[];
};

export type SearchResult = {
  groups: SearchGroup[];
  total: number;
};

/** Пустой результат: запрос короче двух знаков. */
export const emptyResult = (): SearchResult => ({ groups: [], total: 0 });

export async function search(query: string, lang: Lang): Promise<SearchResult> {
  const needle = fold(query.trim());
  if (needle.length < MIN_QUERY) return emptyResult();

  const dict = getDictionary(lang);

  // Только подтверждённые: непроверенное сообщение ещё не опубликовано, и
  // находиться поиском оно не должно.
  const [reports, news] = await Promise.all([
    db.report.findMany({
      where: { status: REPORT_STATUS.APPROVED },
      select: {
        publicId: true,
        headline: true,
        city: true,
        authorComment: true,
        violationType: { select: { slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: SCAN_LIMIT,
    }),
    db.newsItem.findMany({
      select: { id: true, title: true, snippet: true, link: true, source: true },
      orderBy: { publishedAt: "desc" },
      take: SCAN_LIMIT,
    }),
  ]);

  const cases: SearchHit[] = reports
    .filter((row) => hit(needle, row.headline, row.city, row.authorComment))
    .slice(0, PER_GROUP)
    .map((row) => {
      const text = dict.violations[row.violationType.slug as keyof typeof dict.violations];
      return {
        href: `/${lang}/cases/${row.publicId}`,
        title: row.headline ?? text?.name ?? row.violationType.slug,
        note: row.city ?? text?.name ?? null,
      };
    });

  const digest: SearchHit[] = news
    .filter((row) => hit(needle, row.title, row.snippet))
    .slice(0, PER_GROUP)
    .map((row) => {
      const { title, publisher } = splitPublisher(decodeEntities(row.title));
      return {
        href: row.link,
        title,
        note: publisher ?? row.source,
        external: true,
      };
    });

  const types: SearchHit[] = Object.entries(dict.violations)
    .filter(([, text]) => hit(needle, text.name, text.summary, text.about))
    .map(([slug, text]) => ({
      href: `/${lang}/types/${slug}`,
      title: text.name,
      note: text.summary,
    }));

  const glossary: SearchHit[] = Object.values(dict.glossary)
    .filter((entry) => hit(needle, entry.term, entry.body))
    .map((entry) => ({
      href: `/${lang}/glossary`,
      title: entry.term,
      note: entry.body,
    }));

  const groups: SearchGroup[] = (
    [
      { id: "cases", hits: cases },
      { id: "types", hits: types },
      { id: "glossary", hits: glossary },
      { id: "news", hits: digest },
    ] as const
  )
    .filter((group) => group.hits.length > 0)
    .map((group) => ({ ...group }));

  return {
    groups,
    total: groups.reduce((sum, group) => sum + group.hits.length, 0),
  };
}
