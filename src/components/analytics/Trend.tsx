import {
  formatMonth,
  formatMonthShort,
  formatMonthYearShort,
  percent,
} from "@/lib/format";
import { FORMS, violationText, type Dictionary, type Lang } from "@/lib/i18n";
import { withCount } from "@/lib/plural";
import { typeColor } from "@/lib/violation-types";
import type { MonthPoint } from "@/server/public-analytics";
import type { ViolationType } from "@/server/violations";

/*
  Динамика по месяцам: по маленькому графику на каждый вид нарушения.

  Один график со всеми тремя видами сразу был бы плотнее, но требовал бы
  различать их по цвету — а именно этого мы стараемся не требовать: у части
  людей фиолетовый и синий в узком столбике сливаются. Три отдельных
  графика подписаны словом, и цвет в них уже не работа, а украшение.

  Шкала общая, из public-analytics.ts: столбик в 3 случая одинаковой высоты
  на всех трёх графиках. Со своей шкалой у каждого вида три одинаковых
  картинки означали бы три разных числа — самая частая ложь в графиках.

  Под графиками та же таблица числами, спрятанная от глаз. Столбики
  помечены aria-hidden: пересказывать их скринридеру нечем, а таблицу он
  прочтёт как есть.
*/

type Props = {
  dict: Dictionary;
  lang: Lang;
  types: ViolationType[];
  trend: MonthPoint[];
  peak: number;
};

/** Подпись месяца ставим не под каждым столбиком: их двенадцать. */
const labelled = (index: number, length: number) =>
  index === 0 || index === length - 1 || index % 3 === 0;

function Facet({
  name,
  slug,
  trend,
  peak,
  lang,
}: {
  name: string;
  slug: string;
  trend: MonthPoint[];
  peak: number;
  lang: Lang;
}) {
  const yearTotal = trend.reduce((sum, point) => sum + (point.counts[slug] ?? 0), 0);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base">{name}</h3>
        <span className="text-sm tabular-nums text-muted">
          {withCount(yearTotal, FORMS[lang].cases, lang)}
        </span>
      </div>

      <div className="mt-4 flex h-20 items-end gap-0.5" aria-hidden="true">
        {trend.map((point) => {
          const count = point.counts[slug] ?? 0;
          return (
            <div
              key={point.month.toISOString()}
              // Пустой месяц оставляем волосяной чертой, а не пустотой:
              // иначе в ряду не видно, что месяц был и в нём был ноль.
              className={`min-h-0.5 flex-1 ${count > 0 ? typeColor(slug) : "bg-line"}`}
              style={{ height: `${count > 0 ? Math.max(percent(count, peak), 4) : 0}%` }}
              title={`${formatMonth(point.month, lang)}: ${count}`}
            />
          );
        })}
      </div>

      <div className="mt-2 flex gap-0.5" aria-hidden="true">
        {trend.map((point, index) => (
          <span
            key={point.month.toISOString()}
            className="flex-1 font-mono text-2xs text-muted"
          >
            {labelled(index, trend.length) ? formatMonthShort(point.month, lang) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Trend({ dict, lang, types, trend, peak }: Props) {
  const empty = trend.every((point) => point.total === 0);
  if (empty) return <p className="mt-6 text-muted">{dict.analyticsPage.trendEmpty}</p>;

  const from = trend[0]?.month;
  const to = trend.at(-1)?.month;

  return (
    <>
      <div className="mt-8 grid gap-10 sm:grid-cols-3 sm:gap-8">
        {types.map((type) => (
          <Facet
            key={type.slug}
            slug={type.slug}
            name={violationText(dict, type.slug)?.name ?? type.slug}
            trend={trend}
            peak={peak}
            lang={lang}
          />
        ))}
      </div>

      {/* Границы периода словами: под столбиками стоят «ноя.», «фев.» без
          года, и по ним не видно, какой это год. */}
      <p className="mt-6 text-sm text-muted">
        {from && to
          ? `${formatMonthYearShort(from, lang)} — ${formatMonthYearShort(to, lang)} · `
          : ""}
        {withCount(peak, FORMS[lang].cases, lang)} — {dict.analyticsPage.trendPeak}
      </p>

      <table className="sr-only">
        <caption>{dict.analyticsPage.trendTableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{dict.analyticsPage.trendTableMonth}</th>
            {types.map((type) => (
              <th key={type.slug} scope="col">
                {violationText(dict, type.slug)?.name ?? type.slug}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trend.map((point) => (
            <tr key={point.month.toISOString()}>
              <th scope="row">{formatMonth(point.month, lang)}</th>
              {types.map((type) => (
                <td key={type.slug}>{point.counts[type.slug] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
