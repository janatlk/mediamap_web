import { geoMercator } from "d3-geo";

import { REGIONS } from "./regions";

/**
 * Проекция границ и точек в координаты SVG.
 *
 * Меркатор здесь уместен: страна лежит в узкой полосе широт, и искажение
 * на таком участке меньше толщины линии.
 *
 * Важная тонкость про d3-geo. У него геометрия сферическая, и направление
 * обхода кольца решает, какую часть сферы считать внутренней — причём
 * конвенция обратна RFC 7946: внешнее кольцо должно идти по часовой
 * стрелке. Порядок точек приводится к нужному в scripts/prepare-regions.py;
 * если его нарушить, d3 примет за область всю планету и страна съёжится
 * до трёх сотых кадра.
 */

const EXTENT: [[number, number], [number, number]] = [
  [0, 0],
  [200, 100],
];

const projection = geoMercator().fitExtent(EXTENT, {
  type: "FeatureCollection",
  features: REGIONS.map((region) => ({
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "MultiPolygon" as const,
      coordinates: region.rings.map((ring) => [ring]),
    },
  })),
});

/** Переводит долготу и широту в координаты холста SVG. */
export const project = (lng: number, lat: number): [number, number] | null =>
  projection([lng, lat]);

export type ProjectedRegion = { code: string; path: string };

const toPath = (rings: [number, number][][]): string =>
  rings
    .map((ring) => {
      const points = ring
        .map(([lng, lat]) => projection([lng, lat]))
        .filter((point): point is [number, number] => point !== null);
      return (
        points
          .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
          .join("") + "Z"
      );
    })
    .join("");

export const PROJECTED: ProjectedRegion[] = REGIONS.map((region) => ({
  code: region.code,
  path: toPath(region.rings),
}));

/** Рамка холста. Совпадает с EXTENT, поле оставлено под точки у края. */
export const VIEW_BOX = "-4 -4 208 108";
