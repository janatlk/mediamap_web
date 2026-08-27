import type { Lang } from "./i18n";

// Всё, что показываем человеку, проходит отсюда. Одна функция — одно
// преобразование.

const LOCALES: Record<Lang, string> = { ru: "ru-RU", ky: "ky-KG" };

// Пояс прибит гвоздями: сервер может стоять в UTC, и запись, сделанная
// вечером по Бишкеку, покажет вчерашнее число.
const TIME_ZONE = "Asia/Bishkek";

/** Дата в виде 06.11.2024. */
export const formatDate = (date: Date, lang: Lang): string =>
  new Intl.DateTimeFormat(LOCALES[lang], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(date);

/** Месяц и год: «ноябрь 2024». Для группировки списка случаев. */
export const formatMonth = (date: Date, lang: Lang): string =>
  new Intl.DateTimeFormat(LOCALES[lang], {
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(date);

/** Месяц с годом покороче: «ноя. 2024». Для плиток и границ периода. */
export const formatMonthYearShort = (date: Date, lang: Lang): string =>
  new Intl.DateTimeFormat(LOCALES[lang], {
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(date);

/** Короткий месяц: «ноя.». Для подписей под столбиками графика. */
export const formatMonthShort = (date: Date, lang: Lang): string =>
  new Intl.DateTimeFormat(LOCALES[lang], {
    month: "short",
    timeZone: TIME_ZONE,
  }).format(date);

// Домен вместо полного адреса: «facebook.com» читается, а строка на
// двести символов — нет.
export const hostFromUrl = (url: string | null): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // Ссылку могли сохранить без схемы или с опечаткой.
    return null;
  }
};

/** Доля в процентах, округлённая до целого. */
export const percent = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 100);

/*
  Расшифровка HTML-мнемоник в заголовках новостей.

  Ленты отдают заголовок уже с мнемониками: 24.kg присылает
  «ЧМ&nbsp;по&nbsp;футболу». React выводит строку как текст, ничего не
  разбирая, — и человек читает «ЧМ&nbsp;по&nbsp;футболу» буквально.

  Разбираем сами, коротким списком, а не через innerHTML: подставлять чужой
  заголовок в разметку ради расшифровки пробела — это открыть дорогу
  всему остальному, что может приехать в той же строке.

  Неразрывный пробел заменяем обычным: в узкой карточке на телефоне он
  склеивает слова в кусок, который не переносится и лезет за край.
*/
const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  laquo: "«",
  raquo: "»",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

export const decodeEntities = (text: string): string =>
  text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body.startsWith("#")) {
      const code = body[1]?.toLowerCase() === "x"
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
