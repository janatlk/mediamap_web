import { KG_SILHOUETTE, KG_VIEW_BOX_PADDED } from "@/lib/kg-map";
import type { Dictionary } from "@/lib/i18n";
import type { HeatPoint } from "@/server/home-data";

/*
  Тепловая карта нарушений.

  Границ областей тут нет: контуры всех семи склеены в один силуэт, и при
  заливке внутренние линии исчезают.

  Внешний контур обычной обводкой не нарисовать — она прочертила бы обратно
  все межобластные границы, ведь путь состоит из семи отдельных контуров.
  Поэтому контур делает фильтр: он расширяет готовую форму и вычитает её же,
  оставляя кольцо снаружи. Фильтр работает по залитой области, а не по
  отрезкам путей, и внутренних линий просто не видит.

  Плотность рисуется пятнами: под каждым случаем полупрозрачное красное
  пятно с мягким краем, наложения складываются. Где случаев больше, там
  краснее — без ступеней и без легенды по областям.

  Всё обрезано силуэтом страны, поэтому пятна не вылезают за границу, даже
  когда случай стоит у самого края.
*/

type Props = {
  dict: Dictionary;
  points: HeatPoint[];
  /** Сколько точек поставлено в середину области, а не по координатам. */
  approximate: number;
  /** Сколько случаев вовсе без привязки к месту. */
  withoutPlace: number;
};

// Радиус пятна в единицах холста (холст 1000 в ширину). Подобран так,
// чтобы соседние случаи в одном городе сливались, а разные города — нет.
const SPOT_RADIUS = 90;
const BLUR = 26;

// Толщина внешнего контура в единицах холста.
const OUTLINE_WIDTH = 3;

export default function HeatMap({
  dict,
  points,
  approximate,
  withoutPlace,
}: Props) {
  return (
    <figure className="m-0">
      <svg
        viewBox={KG_VIEW_BOX_PADDED}
        className="h-auto w-full"
        role="img"
        aria-label={dict.home.heatAlt}
      >
        <defs>
          <clipPath id="kg-shape">
            <path d={KG_SILHOUETTE} />
          </clipPath>

          {/* Пятно: плотное в середине, сходит на нет к краю. */}
          <radialGradient id="kg-spot">
            <stop offset="0%" stopColor="var(--color-signal)" stopOpacity="0.5" />
            <stop offset="55%" stopColor="var(--color-signal)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-signal)" stopOpacity="0" />
          </radialGradient>

          {/* Размытие поверх — чтобы отдельные пятна читались одним полем. */}
          <filter id="kg-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={BLUR} />
          </filter>

          {/* Внешний контур: расширяем форму и вычитаем исходную — остаётся
              кольцо снаружи. */}
          <filter id="kg-outline" x="-10%" y="-10%" width="120%" height="120%">
            <feMorphology
              in="SourceAlpha"
              operator="dilate"
              radius={OUTLINE_WIDTH}
              result="wider"
            />
            <feComposite in="wider" in2="SourceAlpha" operator="out" result="ring" />
            <feFlood floodColor="var(--color-border)" result="colour" />
            <feComposite in="colour" in2="ring" operator="in" />
          </filter>
        </defs>

        {/* Контур рисуем первым, чтобы тепло легло поверх него. */}
        <g filter="url(#kg-outline)">
          <path d={KG_SILHOUETTE} fill="var(--color-ink)" />
        </g>

        <g clipPath="url(#kg-shape)">
          {/* Основа — цвет бумаги: там, где случаев нет, страна остаётся
              почти белой. */}
          <path d={KG_SILHOUETTE} fill="var(--color-paper)" />

          <g filter="url(#kg-blur)">
            {points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={SPOT_RADIUS}
                fill="url(#kg-spot)"
              />
            ))}
          </g>
        </g>
      </svg>

      <figcaption className="mt-4 text-sm text-muted">
        {dict.home.heatCaption}
        {approximate > 0 ? (
          <span className="block">
            {dict.home.heatApproximate.replace("{n}", String(approximate))}
          </span>
        ) : null}
        {withoutPlace > 0 ? (
          <span className="block">
            {dict.home.heatMissing.replace("{n}", String(withoutPlace))}
          </span>
        ) : null}
        {points.length === 0 ? (
          <span className="block">{dict.home.heatEmpty}</span>
        ) : null}
      </figcaption>
    </figure>
  );
}
