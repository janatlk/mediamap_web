import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { CaseRow, TypeRow } from "@/server/home-data";
import { formatDate, percent } from "@/lib/format";
import { FORMS, type Dictionary, type Lang } from "@/lib/i18n";
import { plural } from "@/lib/plural";

/**
 * Главный блок страницы: сами случаи.
 *
 * Здесь была карта, но привязка к месту у случаев почти не встречается, и
 * карта выходила пустой. Показываем то, что у случая есть всегда: вид
 * нарушения, площадку, дату проверки и номер. Рядом — распределение по
 * видам: оно честно читается и на десяти случаях, и на тысяче.
 */

const TYPE_COLOR: Record<string, string> = {
  "hate-speech": "bg-hate",
  disinformation: "bg-disinfo",
  "digital-fraud": "bg-propaganda",
};

type Props = {
  dict: Dictionary;
  lang: Lang;
  cases: CaseRow[];
  types: TypeRow[];
  total: number;
};

/** Распределение случаев по видам нарушений. */
function Breakdown({ types, total, dict, lang }: Omit<Props, "cases">) {
  const forms = FORMS[lang];

  return (
    <div>
      <ul className="space-y-5">
        {types.map((type) => {
          const share = percent(type.count, total);
          return (
            <li key={type.slug}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base">{type.name[lang]}</span>
                <span className="font-mono text-sm tabular-nums text-muted">
                  {share}%
                </span>
              </div>

              <div className="mt-2 h-1.5 w-full bg-line" aria-hidden="true">
                <div
                  className={`h-full ${TYPE_COLOR[type.slug] ?? "bg-other"}`}
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

/** Одна строка списка случаев. */
function CaseItem({ item, lang, dict }: { item: CaseRow; lang: Lang; dict: Dictionary }) {
  return (
    <li className="border-b border-line py-4">
      {/* Сначала понятное — что и где, — потом дата, и лишь затем номер:
          человек не должен упираться в MM-2024-0065 раньше, чем в суть. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-base">{item.typeName[lang]}</span>
        <span className="font-mono text-2xs text-muted">{item.publicId}</span>
      </div>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted">
        <span className="font-mono text-xs">
          {item.source ?? dict.case.sourceUnknown}
        </span>
        <span aria-hidden="true">·</span>
        <span>{item.city}</span>
        <span aria-hidden="true">·</span>
        <span className="tabular-nums">{formatDate(item.checkedAt, lang)}</span>
      </div>
    </li>
  );
}

export default function CaseFeed({ dict, lang, cases, types, total }: Props) {
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="text-2xl">{dict.home.casesTitle}</h2>
          <p className="mt-2 text-muted">{dict.home.casesLead}</p>
        </div>
        <Link
          href={`/${lang}/cases`}
          className="inline-flex min-h-9 items-center gap-1.5 py-2 text-sm text-signal hover:underline"
        >
          {dict.home.casesAll}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {cases.length === 0 ? (
        <p className="mt-8 text-muted">{dict.home.casesEmpty}</p>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-14">
          <Breakdown dict={dict} lang={lang} types={types} total={total} />

          <ul className="border-t border-line">
            {cases.map((item) => (
              <CaseItem key={item.id} item={item} lang={lang} dict={dict} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
