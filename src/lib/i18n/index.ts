import ru from "./ru";
import type violationsRu from "./violations-ru";
import ky from "./ky";
import type { Lang } from "./languages";

export * from "./languages";

export type Dictionary = typeof ru;

const DICTIONARIES: Record<Lang, Dictionary> = { ru, ky };

export const getDictionary = (lang: Lang): Dictionary => DICTIONARIES[lang];

// Русскому нужны три формы: 1 случай, 2 случая, 5 случаев.
// В кыргызском после числительного слово не меняется — берём первую.
export const FORMS: Record<Lang, Record<string, Forms>> = {
  ru: {
    cases: ["случай", "случая", "случаев"],
    types: ["вид", "вида", "видов"],
    news: ["новость", "новости", "новостей"],
    sources: ["площадка", "площадки", "площадок"],
  },
  ky: {
    cases: ["учур", "учур", "учур"],
    types: ["түр", "түр", "түр"],
    news: ["жаңылык", "жаңылык", "жаңылык"],
    sources: ["аянтча", "аянтча", "аянтча"],
  },
};

export type Forms = readonly [one: string, few: string, many: string];

/**Slug вида, для которого у нас есть тексты. */
export type ViolationSlug = keyof typeof violationsRu;

export type ViolationText = (typeof violationsRu)[ViolationSlug];

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
