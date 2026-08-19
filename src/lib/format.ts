import type { Lang } from "./i18n";

/**
 * Приведение значений к виду, в котором их читает человек.
 * Каждая функция делает ровно одно преобразование.
 */

const LOCALES: Record<Lang, string> = { ru: "ru-RU", ky: "ky-KG" };

/*
  Пояс задан явно. Сервер может стоять в UTC, и запись, сделанная вечером
  по Бишкеку, показывала бы вчерашнее число. Для сайта о Кыргызстане
  верное время — бишкекское, где бы ни крутилось приложение.
*/
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

/**
 * Домен из ссылки: instagram.com вместо всего адреса.
 *
 * Место публикации для проекта важнее точного адреса: показать «facebook.com»
 * полезно, а вывалить строку в двести символов — нет.
 */
export const hostFromUrl = (url: string | null): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // Ссылку могли сохранить без схемы или с опечаткой — тогда домена нет.
    return null;
  }
};

/** Доля в процентах, округлённая до целого. */
export const percent = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 100);
