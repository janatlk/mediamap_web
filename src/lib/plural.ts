import type { Lang } from "./content";

/**
 * Форма существительного при числе.
 *
 * На странице стояло «23 заявок» и «0 заявок» — такое цепляет глаз даже у
 * тех, кто не думает про грамматику, и сразу читается как недоделка.
 *
 * Русский требует три формы: 1 сообщение, 2 сообщения, 5 сообщений.
 * В кыргызском существительное после числительного не меняется, поэтому
 * там форма всегда одна и передаётся первой.
 */

export type Forms = readonly [one: string, few: string, many: string];

export const plural = (count: number, forms: Forms, lang: Lang): string => {
  if (lang === "ky") return forms[0];

  const abs = Math.abs(count);
  const lastTwo = abs % 100;
  // 11–14 выпадают из общего правила: «11 сообщений», а не «11 сообщение».
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];

  const last = abs % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
};

/** Число вместе с нужной формой слова: «23 сообщения». */
export const withCount = (count: number, forms: Forms, lang: Lang): string =>
  `${count} ${plural(count, forms, lang)}`;
