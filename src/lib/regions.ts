import raw from "@/data/regions.json";

/**
 * Границы областей Кыргызстана.
 *
 * Источник: geoBoundaries (gbOpen, KGZ ADM1), построен по данным
 * OpenStreetMap, лицензия ODbL 1.0 — она требует указания источника,
 * ссылка стоит в подвале сайта.
 *
 * Файл упрощён scripts/prepare-regions.py: 173 КБ превратились в 17 КБ,
 * площадь при этом изменилась на 0.04% по стране — на экране это
 * неразличимо.
 *
 * Бишкек и Ош в этом наборе отдельными единицами не выделены: они входят
 * в Чуйскую и Ошскую области. Прежняя база устроена так же, поэтому
 * пересчитывать ничего не пришлось.
 */

export type Region = {
  code: string;
  nameRu: string;
  nameKy: string;
  /** Внешние контуры в градусах: [долгота, широта]. */
  rings: [number, number][][];
  /** [запад, юг, восток, север] */
  bbox: [number, number, number, number];
};

export const REGIONS = raw as Region[];

export const REGION_CODES = REGIONS.map((r) => r.code);

/** Общая рамка страны — по ней карта вписывается в холст. */
export const COUNTRY_BBOX: [number, number, number, number] = [
  Math.min(...REGIONS.map((r) => r.bbox[0])),
  Math.min(...REGIONS.map((r) => r.bbox[1])),
  Math.max(...REGIONS.map((r) => r.bbox[2])),
  Math.max(...REGIONS.map((r) => r.bbox[3])),
];

export const regionName = (code: string, lang: "ru" | "ky"): string => {
  const region = REGIONS.find((r) => r.code === code);
  if (!region) return code;
  return lang === "ky" ? region.nameKy : region.nameRu;
};
