"use client";

import Link from "next/link";
import { useState } from "react";

import RegionMap, { type ReportPoint } from "./RegionMap";

/**
 * Карта и список областей — одна пара с общим состоянием наведения.
 *
 * Список здесь не подпорка для карты, а равноправный способ прочитать те же
 * данные: он работает всегда, доступен с клавиатуры и виден скринридеру.
 * Карта показывает, где нарушения сгущаются, список даёт точные числа.
 */

type RegionRow = { code: string; name: string; count: number };

type Props = {
  data: RegionRow[];
  points: ReportPoint[];
  legend: { slug: string; name: string }[];
  title: string;
  hint: string;
  unitLabel: string;
};

const LEGEND_COLOR: Record<string, string> = {
  "hate-speech": "bg-hate",
  disinformation: "bg-disinfo",
  propaganda: "bg-propaganda",
  other: "bg-other",
};

export default function RegionPanel({
  data,
  points,
  legend,
  title,
  hint,
  unitLabel,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-12">
      <div>
        <div className="-mx-4 h-[260px] sm:h-[320px] lg:mx-0 lg:h-[400px]">
          <RegionMap
            regions={data}
            points={points}
            hovered={hovered}
            onHover={setHovered}
          />
        </div>

        {/* Легенда: без неё цвет точки ничего не значит. */}
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {legend.map((item) => (
            <li key={item.slug} className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${LEGEND_COLOR[item.slug] ?? "bg-other"}`}
                aria-hidden="true"
              />
              <span className="text-xs text-muted">{item.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xl">{title}</h2>
        <p className="mt-1 text-sm text-muted">{hint}</p>

        <ul className="mt-6 border-t border-line">
          {data.map((region) => {
            const isActive = hovered === region.code;
            return (
              <li key={region.code} className="border-b border-line">
                <Link
                  href={`/map?region=${region.code}`}
                  onMouseEnter={() => setHovered(region.code)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(region.code)}
                  onBlur={() => setHovered(null)}
                  className={`flex items-center gap-4 py-3 transition-colors ${
                    isActive ? "bg-surface" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {region.name}
                  </span>

                  <span
                    className="hidden h-[3px] w-24 bg-line sm:block"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full bg-signal"
                      style={{ width: `${Math.round((region.count / max) * 100)}%` }}
                    />
                  </span>

                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {region.count}
                  </span>
                  <span className="sr-only">{unitLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
