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
