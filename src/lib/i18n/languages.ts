// Два готовы, три висят заглушками — видно, что работа идёт, но выбрать
// нельзя. Обещать язык и отдать пустые строки хуже честного «скоро».
//
// Порядок в списке — это порядок в переключателе. Кыргызский первым: это
// государственный язык страны, о медиа которой сайт.

export const LANGUAGES = [
  { code: "ky", name: "Кыргызча", short: "KY", ready: true },
  { code: "ru", name: "Русский", short: "RU", ready: true },
  { code: "en", name: "English", short: "EN", ready: false },
  { code: "uz", name: "Oʻzbekcha", short: "UZ", ready: false },
  { code: "kk", name: "Қазақша", short: "KK", ready: false },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** Только у этих есть страницы. */
export const READY_LANGUAGES = ["ky", "ru"] as const;

export type Lang = (typeof READY_LANGUAGES)[number];

/**
 * Куда попадает посетитель, пришедший без языка в адресе.
 *
 * Кыргызский. Русские страницы никуда не делись и открываются по своему
 * адресу — меняется только то, что показывают по умолчанию.
 */
export const DEFAULT_LANG: Lang = "ky";

/**
 * Язык панели и всего, что читает сотрудник.
 *
 * Отдельно от DEFAULT_LANG намеренно. Панель одноязычная — так решено в
 * proxy.ts, — и если бы она ходила за языком посетителя, то вместе с
 * переключением сайта на кыргызский на кыргызский уехали бы и служебные
 * экраны, и ссылки «как видит заявитель», и даты в очереди.
 */
export const STAFF_LANG: Lang = "ru";

export const isReadyLanguage = (value: string): value is Lang =>
  (READY_LANGUAGES as readonly string[]).includes(value);
