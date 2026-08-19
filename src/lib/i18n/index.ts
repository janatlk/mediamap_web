import ru from "./ru";
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
