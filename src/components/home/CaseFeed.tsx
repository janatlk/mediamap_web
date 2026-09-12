import Link from "next/link";
import { ArrowRight } from "lucide-react";

import CaseList from "@/components/cases/CaseList";
import type { CaseRow } from "@/server/home-data";
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
};

/** Распределение случаев по видам нарушений. */
function Breakdown({ types, dict, lang }: Omit<Props, "cases" | "total">) {
  const forms = FORMS[lang];
  const percents = shares(types.map((type) => type.count));

  return (
    <div>
      {/*
        Две раскладки одних и тех же долей.

        На широком экране доли стоят столбиками: колонка слева от списка
        высокая, и вертикальные столбики занимают её, а не жмутся полосками
        к верху. На телефоне колонка во всю ширину и одна над другой — там
        горизонтальные полосы читаются лучше, и они остались как были.

        Скрытая раскладка убрана через display:none, поэтому экранный
        диктор читает только одну из двух.
      */}
      <VerticalBars
        className="hidden lg:flex"
        items={types.map((type, index) => ({
          key: type.slug,
          label: violationText(dict, type.slug)?.name ?? type.slug,
          count: type.count,
          share: percents[index],
          color: typeColor(type.slug),
        }))}
      />

      <ul className="space-y-5 lg:hidden">
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

    </div>
  );
}

type Bar = { key: string; label: string; count: number; share: number; color: string };

/** Вертикальные столбики долей. Узкие: во всю колонку выходили квадратами. */
function VerticalBars({ items, className }: { items: Bar[]; className: string }) {
  return (
    <ul className={`items-start gap-6 ${className}`}>
      {items.map((item) => (
        <li key={item.key} className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm tabular-nums text-muted">{item.share}%</span>
          {/* Высота столбика задана, а не «сколько останется»: иначе у вида с
              подписью в две строки столбик выходил короче и низы гуляли. */}
          <div className="relative mt-2 h-56 w-12 bg-line">
            {/* Число случаев прямо на столбике, а не строкой под ним.
                Невысокий столбик всё равно вмещает цифру: min-h. */}
            <div
              className={`absolute inset-x-0 bottom-0 flex min-h-7 items-start justify-center pt-1.5 ${item.color}`}
              style={{ height: `${item.share}%` }}
            >
              <span className="text-sm font-medium tabular-nums text-surface">{item.count}</span>
            </div>
          </div>
          <span className="mt-3 text-sm leading-snug">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CaseFeed({ dict, lang, cases, types }: Props) {
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
            <Breakdown dict={dict} lang={lang} types={types} />

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
