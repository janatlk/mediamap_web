"use client";

import { useMemo } from "react";

import { PROJECTED, VIEW_BOX, project } from "@/lib/projection";

/**
 * Карта нарушений: контуры областей и точка на месте каждой заявки.
 *
 * Заливка по областям показала бы среднее, а среднее здесь и есть то, что
 * теряется: одна область — это сотни километров, и важно, что нарушения
 * собираются вокруг городов, а не размазаны ровно. Поэтому области даны
 * контуром, а данные — точками на их настоящих координатах.
 *
 * Цвет точки означает категорию нарушения и совпадает с цветом категории
 * в остальных разделах.
 */

export type ReportPoint = {
  id: number;
  lat: number;
  lng: number;
  typeSlug: string;
};

type Props = {
  regions: { code: string; count: number }[];
  points: ReportPoint[];
  hovered: string | null;
  onHover: (code: string | null) => void;
};

const TYPE_COLOR: Record<string, string> = {
  "hate-speech": "var(--color-hate)",
  disinformation: "var(--color-disinfo)",
  propaganda: "var(--color-propaganda)",
  other: "var(--color-other)",
};

export default function RegionMap({ regions, points, hovered, onHover }: Props) {
  const projected = useMemo(
    () =>
      points
        .map((point) => {
          const xy = project(point.lng, point.lat);
          return xy ? { ...point, x: xy[0], y: xy[1] } : null;
        })
        .filter((point): point is ReportPoint & { x: number; y: number } =>
          point !== null,
        ),
    [points],
  );

  const hasCount = useMemo(
    () => new Map(regions.map((r) => [r.code, r.count])),
    [regions],
  );

  return (
    <svg
      viewBox={VIEW_BOX}
      className="h-full w-full overflow-visible"
      // Те же данные стоят списком рядом, пересказывать карту незачем.
      aria-hidden="true"
    >
      {PROJECTED.map((region) => {
        const isHovered = hovered === region.code;
        const isEmpty = (hasCount.get(region.code) ?? 0) === 0;

        return (
          <path
            key={region.code}
            d={region.path}
            fill={isHovered ? "var(--color-surface)" : "transparent"}
            stroke={isHovered ? "var(--color-ink)" : "var(--color-border)"}
            strokeWidth={isHovered ? 0.6 : 0.35}
            strokeLinejoin="round"
            // Область без заявок бледнее: нечего показывать — не привлекаем.
            opacity={isEmpty ? 0.45 : 1}
            onMouseEnter={() => onHover(region.code)}
            onMouseLeave={() => onHover(null)}
            className="transition-[fill,stroke] duration-150"
          />
        );
      })}

      {/* Точки лежат поверх контуров, иначе линия границы режет их пополам.
          Курсор они не перехватывают: иначе при наведении на точку область
          под ней получала бы уход курсора и подсветка гасла. Наведение
          принадлежит области — точки пока ничего не делают по нажатию. */}
      <g pointerEvents="none">
        {projected.map((point) => (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={1.5}
            fill={TYPE_COLOR[point.typeSlug] ?? TYPE_COLOR.other}
            // Обводка цветом фона отделяет соседние точки друг от друга
            // там, где заявки скучиваются вокруг города.
            stroke="var(--color-paper)"
            strokeWidth={0.5}
          />
        ))}
      </g>
    </svg>
  );
}
