"use client";

import { useMemo } from "react";

import { PROJECTED, VIEW_BOX, project } from "@/lib/projection";

/**
 * Карта нарушений: контуры областей и точка на месте каждого сообщения.
 *
 * Заливка по областям показала бы среднее, а среднее здесь и есть то, что
 * теряется: одна область — сотни километров, и важно, что нарушения
 * собираются вокруг городов, а не размазаны ровно. Поэтому области даны
 * контуром, а данные — точками на их настоящих координатах.
 *
 * Цвет точки означает вид нарушения и совпадает с цветом вида в разделе
 * под картой — отдельная легенда для этого не нужна.
 *
 * Область выбирается и наведением, и нажатием: подсказка «наведите»
 * невыполнима на телефоне, а с телефона заходит большая часть людей.
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
  active: string | null;
  onSelect: (code: string | null) => void;
};

const TYPE_COLOR: Record<string, string> = {
  "hate-speech": "var(--color-hate)",
  disinformation: "var(--color-disinfo)",
  propaganda: "var(--color-propaganda)",
  other: "var(--color-other)",
};

export default function RegionMap({ regions, points, active, onSelect }: Props) {
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

  const counts = useMemo(
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
        const isActive = active === region.code;
        const isEmpty = (counts.get(region.code) ?? 0) === 0;

        return (
          <path
            key={region.code}
            d={region.path}
            fill={isActive ? "var(--color-surface)" : "transparent"}
            stroke={isActive ? "var(--color-ink)" : "var(--color-border)"}
            strokeWidth={isActive ? 0.6 : 0.35}
            strokeLinejoin="round"
            // Область без сообщений бледнее: нечего показывать — не зовём.
            opacity={isEmpty ? 0.45 : 1}
            onMouseEnter={() => onSelect(region.code)}
            onMouseLeave={() => onSelect(null)}
            // Нажатие для тех, у кого нет курсора. Повторное нажатие по
            // той же области снимает выбор.
            onClick={() => onSelect(isActive ? null : region.code)}
            className="cursor-pointer transition-[fill,stroke] duration-150"
          />
        );
      })}

      {/* Точки лежат поверх контуров, иначе линия границы режет их пополам.
          Курсор они не перехватывают: иначе при наведении на точку область
          под ней получала бы уход курсора и подсветка гасла. */}
      <g pointerEvents="none">
        {projected.map((point) => (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={1.5}
            fill={TYPE_COLOR[point.typeSlug] ?? TYPE_COLOR.other}
            // Обводка цветом фона отделяет соседние точки друг от друга
            // там, где сообщения скучиваются вокруг города.
            stroke="var(--color-paper)"
            strokeWidth={0.5}
          />
        ))}
      </g>
    </svg>
  );
}
