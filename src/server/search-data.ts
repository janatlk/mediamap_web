import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { decodeEntities, hostFromUrl } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import { splitPublisher } from "./news-data";

/*
  Поиск по сайту.

  Отбор идёт в коде, а не запросом. Причина не в лени: у Prisma на SQLite
  нет режима без учёта регистра, а LIKE в самом SQLite приводит к одному
  регистру только латиницу — «Дезинформация» и «дезинформация» для него
  разные слова. Городить ради этого расширение к базе ради шестидесяти
  случаев и трёхсот новостей незачем; при переезде на Postgres здесь
  появится обычный ILIKE, и это будет видно по одному файлу.

  Ищем по началу слова, а не по любому вхождению: «вид» иначе находил бы
  «свидетель». Русская и кыргызская морфология этим не покрывается —
  «случая» по запросу «случай» не найдётся, — и это осознанный размен:
  лишние совпадения раздражают сильнее, чем ненайденное окончание.
*/

/** Минимальная длина запроса. Один знак находит половину сайта. */
export const MIN_QUERY = 2;

/** Сколько показываем в каждой группе. */
const PER_GROUP = 8;

export type SearchHit = {
  /** Что показать строкой. */
  title: string;
  /** Пояснение под строкой: вид, площадка, дата. */
  note?: string;
  href: string;
  /** Уводит ли ссылка с сайта. */
  external?: boolean;
};

export type SearchGroupId = "cases" | "news" | "types" | "glossary" | "pages";

export type SearchGroup = {
  id: SearchGroupId;
  hits: SearchHit[];
  /** Сколько нашлось всего, если показали не всё. */
  total: number;
};

export type SearchResult = {
  query: string;
  groups: SearchGroup[];
  total: number;
};

/**
 * Приводит строку к виду, по которому сравниваем.
 *
 * Ё и е — одна буква для того, кто ищет: «еж» должен находить «ёж». По той
 * же причине убираем всё, кроме букв и цифр: человек набирает «MM-2026-0142»
 * и «mm20260142», имея в виду одно и то же.
 */
const normalize = (text: string) =>
  text.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Есть ли в тексте слово, начинающееся на каждое слово запроса. */
function matches(haystack: (string | null | undefined)[], needles: string[]): boolean {
  const words = normalize(haystack.filter(Boolean).join(" ")).split(" ");
  return needles.every((needle) =>
    words.some((word) => word.startsWith(needle)),
  );
}

const group = (id: SearchGroupId, hits: SearchHit[]): SearchGroup => ({
  id,
  hits: hits.slice(0, PER_GROUP),
  total: hits.length,
});

/** Проверенные сообщения: заголовок, номер, площадка, город, разбор. */
async function searchCases(
  words: string[],
  lang: Lang,
  dict: Dictionary,
): Promise<SearchGroup> {
  const rows = await db.report.findMany({
    where: { status: REPORT_STATUS.APPROVED },
    orderBy: { createdAt: "desc" },
    include: { violationType: true },
  });

  const hits = rows
    .filter((row) =>
      matches(
        [
          row.headline,
          row.publicId,
          row.city,
          hostFromUrl(row.mediaLink),
          row.moderatorComment,
          row.authorComment,
          dict.violations[row.violationType.slug as keyof typeof dict.violations]?.name,
        ],
        words,
      ),
    )
    .map((row) => {
      const typeName =
        dict.violations[row.violationType.slug as keyof typeof dict.violations]?.name ??
        row.violationType.slug;

      // Вид повторяем в пояснении только тогда, когда заголовок свой.
      // Без этого у старых случаев без заголовка строка выходила
      // «Дезинформация / Дезинформация · youtube.com».
      return {
        title: row.headline ?? typeName,
        note: [row.headline ? typeName : null, hostFromUrl(row.mediaLink), row.publicId]
          .filter(Boolean)
          .join(" · "),
        href: `/${lang}/cases/${row.id}`,
      };
    });

  return group("cases", hits);
}

/** Медиа-дайджест: заголовок, издание, подзаголовок. */
async function searchNews(words: string[]): Promise<SearchGroup> {
  const rows = await db.newsItem.findMany({
    orderBy: { publishedAt: "desc" },
    take: 400,
  });

  const seen = new Set<string>();
  const hits = rows
    .filter((row) => matches([row.title, row.snippet, row.source], words))
    .map((row) => {
      const parsed = splitPublisher(decodeEntities(row.title));
      return {
        title: parsed.title,
        note: parsed.publisher ?? row.source,
        href: row.link,
        external: true,
      };
    })
    // Один материал приезжает из разных лент — см. news-data.ts.
    .filter((hit) => {
      const key = hit.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return group("news", hits);
}

/** Виды нарушений: всё, что о них написано в словаре. */
function searchTypes(words: string[], lang: Lang, dict: Dictionary): SearchGroup {
  const hits = Object.entries(dict.violations)
    .filter(([, text]) =>
      matches([text.name, text.summary, text.about, text.legal, ...text.examples], words),
    )
    .map(([slug, text]) => ({
      title: text.name,
      note: text.summary,
      href: `/${lang}/types/${slug}`,
    }));

  return group("types", hits);
}

/** Глоссарий: термин и определение. */
function searchGlossary(words: string[], lang: Lang, dict: Dictionary): SearchGroup {
  const hits = dict.glossary.flatMap((section) =>
    section.entries
      .filter((entry) => matches([entry.term, entry.definition], words))
      .map((entry) => ({
        title: entry.term,
        note: entry.definition,
        href: `/${lang}/glossary#term-${encodeURIComponent(entry.term)}`,
      })),
  );

  return group("glossary", hits);
}

/** Страницы сайта: заголовок и вводный абзац. */
function searchPages(words: string[], lang: Lang, dict: Dictionary): SearchGroup {
  const pages = [
    { title: dict.aboutPage.title, note: dict.aboutPage.lead, href: `/${lang}/about` },
    { title: dict.contactsPage.title, note: dict.contactsPage.lead, href: `/${lang}/contacts` },
    { title: dict.reportPage.title, note: dict.reportPage.lead, href: `/${lang}/report` },
    { title: dict.analyticsPage.title, note: dict.analyticsPage.lead, href: `/${lang}/analytics` },
    { title: dict.resourcesPage.title, note: dict.resourcesPage.lead, href: `/${lang}/resources` },
    { title: dict.glossaryPage.title, note: dict.glossaryPage.lead, href: `/${lang}/glossary` },
    { title: dict.quizPage.title, note: dict.quizPage.lead, href: `/${lang}/quiz` },
    { title: dict.newsPage.title, note: dict.newsPage.lead, href: `/${lang}/news` },
    { title: dict.cases.title, note: dict.cases.lead, href: `/${lang}/cases` },
  ];

  return group(
    "pages",
    pages.filter((page) => matches([page.title, page.note], words)),
  );
}

export async function search(
  rawQuery: string,
  lang: Lang,
  dict: Dictionary,
): Promise<SearchResult> {
  const query = rawQuery.trim();
  const words = normalize(query).split(" ").filter(Boolean);

  if (query.length < MIN_QUERY || words.length === 0) {
    return { query, groups: [], total: 0 };
  }

  const [cases, news] = await Promise.all([
    searchCases(words, lang, dict),
    searchNews(words),
  ]);

  const groups = [
    cases,
    searchTypes(words, lang, dict),
    searchGlossary(words, lang, dict),
    news,
    searchPages(words, lang, dict),
  ].filter((item) => item.total > 0);

  return {
    query,
    groups,
    total: groups.reduce((sum, item) => sum + item.total, 0),
  };
}
