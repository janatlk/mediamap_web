/*
  Языки, на которые предлагаем переводить новости.

  Названия на самих языках, а не переведённые: человек, которому нужен
  узбекский, ищет глазами «O‘zbekcha», а не «Узбекский». Заодно список не
  приходится держать в двух словарях.

  Порядок осмысленный: языки страны, потом соседи, потом мир. Список тот же,
  что у ML-сервиса, — если разойдутся, сервис ответит отказом на язык,
  которого нет в его таблице.
*/

export const TRANSLATION_LANGUAGES = {
  ky: "Кыргызча",
  ru: "Русский",
  en: "English",
  uz: "O‘zbekcha",
  kk: "Қазақша",
  tg: "Тоҷикӣ",
  tr: "Türkçe",
  zh: "中文",
  ar: "العربية",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
} as const;

export type TranslationLang = keyof typeof TRANSLATION_LANGUAGES;

export const TRANSLATION_CODES = Object.keys(
  TRANSLATION_LANGUAGES,
) as TranslationLang[];

export const isTranslationLang = (value: string): value is TranslationLang =>
  value in TRANSLATION_LANGUAGES;
