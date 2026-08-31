import ru from "./ru";
import type violationsRu from "./violations-ru";
import ky from "./ky";
import en from "./en";
import type { Lang } from "./languages";

export * from "./languages";

export type Dictionary = typeof ru;

const DICTIONARIES: Record<Lang, Dictionary> = { ru, ky, en };

export const getDictionary = (lang: Lang): Dictionary => DICTIONARIES[lang];

// Русскому нужны три формы: 1 случай, 2 случая, 5 случаев.
// В кыргызском после числительного слово не меняется — берём первую.
export const FORMS: Record<Lang, Record<string, Forms>> = {
  ru: {
    cases: ["случай", "случая", "случаев"],
    types: ["вид", "вида", "видов"],
    news: ["новость", "новости", "новостей"],
    sources: ["площадка", "площадки", "площадок"],
    days: ["день", "дня", "дней"],
  },
  ky: {
    cases: ["учур", "учур", "учур"],
    types: ["түр", "түр", "түр"],
    news: ["жаңылык", "жаңылык", "жаңылык"],
    sources: ["аянтча", "аянтча", "аянтча"],
    days: ["күн", "күн", "күн"],
  },
  // Английскому нужны две формы; третья повторяет вторую и не используется.
  en: {
    cases: ["case", "cases", "cases"],
    types: ["type", "types", "types"],
    news: ["item", "items", "items"],
    sources: ["platform", "platforms", "platforms"],
    days: ["day", "days", "days"],
  },
};

export type Forms = readonly [one: string, few: string, many: string];

/**Slug вида, для которого у нас есть тексты. */
export type ViolationSlug = keyof typeof violationsRu;

export type ViolationText = (typeof violationsRu)[ViolationSlug];

/**
 * Все известные виды нарушений.
 *
 * Берётся из словаря, а не пишется списком рядом: список пришлось бы
 * помнить и дополнять вторым местом при заведении нового вида.
 */
export const VIOLATION_SLUGS = Object.keys(ru.violations) as ViolationSlug[];

/**
 * Тексты вида по slug из базы.
 *
 * Slug приходит из базы обычной строкой, а словарь знает лишь свои ключи.
 * Если вид завели в базе, а тексты написать забыли, возвращаем null —
 * пусть место вызова решает, что показать, вместо падения страницы.
 */
export const violationText = (
  dict: Dictionary,
  slug: string,
): ViolationText | null =>
  (dict.violations as Record<string, ViolationText | undefined>)[slug] ?? null;
