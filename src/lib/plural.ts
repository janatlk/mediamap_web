import type { Forms, Lang } from "./i18n";

// Было «23 заявок» и «0 заявок» — цепляет глаз даже у тех, кто про
// грамматику не думает.
export const plural = (count: number, forms: Forms, lang: Lang): string => {
  if (lang === "ky") return forms[0];

  const abs = Math.abs(count);
  // 11–14 выпадают из общего правила: «11 случаев», а не «11 случай».
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];

  const last = abs % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
};

/** Число вместе с нужной формой слова: «23 случая». */
export const withCount = (count: number, forms: Forms, lang: Lang): string =>
  `${count} ${plural(count, forms, lang)}`;
