/**
 * Языки сайта.
 *
 * Два готовы, три стоят заглушками: переключатель показывает их сразу,
 * чтобы человек видел, куда идёт дело, но выбрать их нельзя, пока нет
 * перевода. Обещать язык и отдать пустые строки хуже, чем честно сказать
 * «скоро».
 */

export const LANGUAGES = [
  { code: "ru", name: "Русский", short: "RU", ready: true },
  { code: "ky", name: "Кыргызча", short: "KY", ready: true },
  { code: "en", name: "English", short: "EN", ready: false },
  { code: "uz", name: "Oʻzbekcha", short: "UZ", ready: false },
  { code: "kk", name: "Қазақша", short: "KK", ready: false },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** Языки, для которых есть перевод. Только у них бывают страницы. */
export const READY_LANGUAGES = ["ru", "ky"] as const;

export type Lang = (typeof READY_LANGUAGES)[number];

export const DEFAULT_LANG: Lang = "ru";

export const isReadyLanguage = (value: string): value is Lang =>
  (READY_LANGUAGES as readonly string[]).includes(value);
