"use client";

import Link from "next/link";
import { useState } from "react";

import RegionMap, { type ReportPoint } from "./RegionMap";
import type { Lang } from "@/lib/content";
import { plural, type Forms } from "@/lib/plural";

/**
 * Карта и список областей — одна пара с общим состоянием выбора.
 *
 * Список здесь не подпорка для карты, а равноправный способ прочитать те же
 * данные: он работает всегда, доступен с клавиатуры и виден скринридеру.
 * Карта показывает, где нарушения сгущаются, список даёт точные числа.
 *
 * Названия областей на самой карте не подписаны — на обзорной карте семь
 * подписей налезают друг на друга. Вместо этого название выбранной области
 * выводится строкой под картой: это работает и при наведении мышью, и при
 * касании пальцем.
 */

type RegionRow = { code: string; name: string; count: number };

type Props = {
  data: RegionRow[];
  points: ReportPoint[];
  title: string;
  hint: string;
  caption: string;
  reportForms: Forms;
  lang: Lang;
};

export default function RegionPanel({
  data,
  points,
  title,
  hint,
  caption,
  reportForms,
  lang,
}: Props) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const selected = data.find((region) => region.code === active) ?? null;

  return (
    <div>
      {/* Заголовок раздела стоит над картой и списком сразу: раньше он
          принадлежал правой колонке, и в порядке чтения карта с подписью
          шли раньше собственного названия. */}
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-2 text-muted">{hint}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-12">
        <div>
          <div className="-mx-4 h-[260px] sm:h-[320px] lg:mx-0 lg:h-[400px]">
            <RegionMap
              regions={data}
              points={points}
              active={active}
              onSelect={setActive}
            />
          </div>

          {/*
            Одна строка на два дела: пока ничего не выбрано, она объясняет,
            что означает точка; при выборе — называет область и число.
            Высота задана заранее, иначе содержимое под картой прыгало бы
            при каждом движении курсора.

            aria-live не ставим: строка меняется на каждое движение мыши, и
            скринридер захлебнулся бы. Те же данные лежат в списке рядом.
          */}
          <p className="mt-4 min-h-12 text-sm text-muted">
            {selected ? (
              <>
                <span className="text-ink">{selected.name}</span> —{" "}
                <span className="tabular-nums">{selected.count}</span>{" "}
                {plural(selected.count, reportForms, lang)}
              </>
            ) : (
              caption
            )}
          </p>
        </div>

        <ul className="border-t border-line">
          {data.map((region) => {
            const isActive = active === region.code;
            return (
              <li key={region.code} className="border-b border-line">
                <Link
                  href={`/map?region=${region.code}`}
                  onMouseEnter={() => setActive(region.code)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(region.code)}
                  onBlur={() => setActive(null)}
                  className={`flex items-center gap-4 py-3 transition-colors ${
                    isActive ? "bg-surface" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-base">
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
                  <span className="sr-only">
                    {plural(region.count, reportForms, lang)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
