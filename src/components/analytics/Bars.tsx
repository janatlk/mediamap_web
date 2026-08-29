import { typeColor } from "@/lib/violation-types";
import type { MonthPoint } from "@/server/public-analytics";

/*
  Столбики помесячной динамики для одного вида нарушений.

  Один график на вид, а не один общий со всеми сразу. В общем высоту
  столбика приходится читать вместе с цветом, и различать три близких
  оттенка глазами — работа. Здесь высота единственное, что нужно прочесть.

  Шкала приходит снаружи и у всех графиков одна: три одинаковые на вид
  картинки при разных числах — худшее, что может сделать такой раздел.

  Рисуем div'ами, без библиотеки графиков: тут нечего анимировать и не по
  чему водить мышью, а библиотека стоила бы сотни килобайт на странице,
  которую открывают раз в месяц.
*/

type Props = {
  slug: string;
  points: MonthPoint[];
  /** Общий потолок шкалы. */
  max: number;
  /** Подпись месяца — форматирует страница, она знает язык. */
  label: (month: Date) => string;
  /** Название столбика для тех, кто не видит картинку. */
  describe: (month: Date, total: number) => string;
};

export default function Bars({ slug, points, max, label, describe }: Props) {
  return (
    <ol className="mt-4 flex h-32 items-end gap-1">
      {points.map((point) => (
        <li
          key={point.month.getTime()}
          className="flex h-full flex-1 flex-col justify-end"
          title={describe(point.month, point.total)}
        >
          {/* Нулевой месяц оставляет полоску в один пиксель: пустое место
              читается как «данных нет», а ноль — это данные. */}
          <span
            className={`w-full ${point.total > 0 ? typeColor(slug) : "bg-line"}`}
            style={{
              height: point.total > 0 ? `${(point.total / max) * 100}%` : "1px",
            }}
            aria-hidden="true"
          />
          <span className="sr-only">{describe(point.month, point.total)}</span>
          <span className="mt-1 block truncate text-center text-2xs text-muted">
            {label(point.month)}
          </span>
        </li>
      ))}
    </ol>
  );
}
