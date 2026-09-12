import Link from "next/link";
import { ArrowRight } from "lucide-react";

import CaseList from "@/components/cases/CaseList";
import TrendLine from "./TrendLine";
import type { CaseRow, TrendPoint } from "@/server/home-data";
import type { ViolationType } from "@/server/violations";
import { shares } from "@/lib/format";
import { FORMS, violationText, type Dictionary, type Lang } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";
import { plural } from "@/lib/plural";

// Главный блок. Тут была карта, но привязка к месту у случаев редкая —
// висело бы пять точек на всю страну. Показываем то, что есть всегда:
// вид, площадка, дата, номер. Рядом доли по видам — читается и на десяти
// случаях, и на тысяче.


type Props = {
  dict: Dictionary;
  lang: Lang;
  cases: CaseRow[];
  types: ViolationType[];
  total: number;
  trend: TrendPoint[];
};

/** Распределение случаев по видам нарушений. */
function Breakdown({ types, dict, lang, trend }: Omit<Props, "cases" | "total">) {
  const forms = FORMS[lang];
  const percents = shares(types.map((type) => type.count));

  return (
    <div>
      <ul className="space-y-5">
        {types.map((type, index) => {
          const share = percents[index];
          return (
            <li key={type.slug}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base">{violationText(dict, type.slug)?.name ?? type.slug}</span>
                <span className="text-sm tabular-nums text-muted">
                  {share}%
                </span>
              </div>

              <div className="mt-2 h-1.5 w-full bg-line" aria-hidden="true">
                <div
                  className={`h-full ${typeColor(type.slug)}`}
                  style={{ width: `${share}%` }}
                />
              </div>

              <p className="mt-1.5 text-sm text-muted">
                {type.count} {plural(type.count, forms.cases, lang)}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-sm text-muted">{dict.home.casesShare}</p>

      <TrendLine points={trend} lang={lang} caption={dict.home.trendCaption} />
    </div>
  );
}

export default function CaseFeed({ dict, lang, cases, types, trend }: Props) {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-16 lg:px-10 lg:py-24">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl">{dict.home.casesTitle}</h2>
            <p className="mt-2 text-muted">{dict.home.casesLead}</p>
          </div>
          <Link
            href={`/${lang}/cases`}
            className="inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-signal hover:underline"
          >
            {dict.home.casesAll}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {cases.length === 0 ? (
          <p className="mt-8 text-muted lg:mt-12">{dict.home.casesEmpty}</p>
        ) : (
          <div className="mt-8 grid gap-10 lg:mt-12 lg:grid-cols-[1fr_1.5fr] lg:gap-14">
            <Breakdown dict={dict} lang={lang} types={types} trend={trend} />

            {/* Тот же список, что на странице случаев. Здесь стояла своя
                копия — с другой раскладкой и без ссылок: строки не
                открывались. */}
            <CaseList cases={cases} dict={dict} lang={lang} />
          </div>
        )}
      </div>
    </section>
  );
}
