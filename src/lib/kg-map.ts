import raw from "@/data/regions.json";

/*
  Контуры областей Кыргызстана для тепловой карты.

  Источник: geoBoundaries (gbOpen, KGZ ADM1) по данным OpenStreetMap,
  лицензия ODbL 1.0 — она требует указания источника, ссылка в подвале.
  Исходные 173 КБ упрощены до 17 КБ, площадь по стране изменилась на 0.04%.

  Проекцию считаем сами, десятком строк, вместо библиотеки. Меркатор на
  такой полосе широт искажает меньше толщины линии, а у d3-geo своя
  конвенция направления обхода колец, на которой мы уже спотыкались:
  при «неправильном» порядке точек он считал областью всю планету.
  Собственный расчёт про обход не знает вовсе.
*/

type RawRegion = {
  code: string;
  nameRu: string;
  nameKy: string;
  rings: [number, number][][];
};

const REGIONS = raw as unknown as RawRegion[];

/*
  Меркатор. Обе оси в радианах — это важно: если долготу оставить в
  градусах, а широту перевести, оси окажутся в разных единицах и страна
  вытянется в полоску с соотношением сторон 115 к 1.
*/
const RAD = Math.PI / 180;

const mercatorX = (lng: number) => lng * RAD;
const mercatorY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));

const VIEW_WIDTH = 1000;

const points = REGIONS.flatMap((region) => region.rings.flat());
const bounds = {
  minX: Math.min(...points.map(([lng]) => mercatorX(lng))),
  maxX: Math.max(...points.map(([lng]) => mercatorX(lng))),
  minY: Math.min(...points.map(([, lat]) => mercatorY(lat))),
  maxY: Math.max(...points.map(([, lat]) => mercatorY(lat))),
};

const scale = VIEW_WIDTH / (bounds.maxX - bounds.minX);
const VIEW_HEIGHT = Math.round((bounds.maxY - bounds.minY) * scale);

/** Точка в координаты холста. Ось Y переворачиваем: в SVG она растёт вниз. */
const project = (lng: number, lat: number): [number, number] => [
  (mercatorX(lng) - bounds.minX) * scale,
  (bounds.maxY - mercatorY(lat)) * scale,
];

export type MapRegion = {
  code: string;
  name: { ru: string; ky: string };
  path: string;
  /** Середина области — сюда ставим случаи, у которых есть только область. */
  center: [number, number];
};

export const KG_VIEW_BOX = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;

/** Середина по габаритам кольца. Точности тут не нужно — это метка, не расчёт. */
function centerOf(region: RawRegion): [number, number] {
  const all = region.rings.flat().map(([lng, lat]) => project(lng, lat));
  const xs = all.map(([x]) => x);
  const ys = all.map(([, y]) => y);
  return [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
  ];
}

export const KG_REGIONS: MapRegion[] = REGIONS.map((region) => ({
  code: region.code,
  name: { ru: region.nameRu, ky: region.nameKy },
  center: centerOf(region),
  path: region.rings
    .map(
      (ring) =>
        ring
          .map(([lng, lat], index) => {
            const [x, y] = project(lng, lat);
            return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join("") + "Z",
    )
    .join(""),
}));

/**
 * Силуэт страны одной фигурой.
 *
 * Контуры всех областей склеены в один путь: при заливке они сливаются, и
 * внутренних границ не остаётся. Обводки у него нет намеренно — обводка
 * прочертила бы как раз те межобластные линии, которые мы убираем.
 */
export const KG_SILHOUETTE = KG_REGIONS.map((region) => region.path).join(" ");

/** Точка на карте по координатам. */
export const toCanvas = (lng: number, lat: number): [number, number] =>
  project(lng, lat);

/** Середина области по её коду — для случаев без точных координат. */
export const regionCenter = (code: string): [number, number] | null =>
  KG_REGIONS.find((region) => region.code === code)?.center ?? null;
