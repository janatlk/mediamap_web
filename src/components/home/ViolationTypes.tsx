import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ViolationType } from "@/server/violations";
import { FORMS, violationText, type Dictionary, type Lang } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";
import { withCount } from "@/lib/plural";

/** Три вида нарушений: что именно мы собираем. */


type Props = { dict: Dictionary; lang: Lang; types: ViolationType[] };

export default function ViolationTypes({ dict, lang, types }: Props) {
  const forms = FORMS[lang];

  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="text-2xl">{dict.home.typesTitle}</h2>
            <p className="mt-2 max-w-prose text-muted">{dict.home.typesLead}</p>
          </div>
          <Link
            href={`/${lang}/types`}
            className="inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-signal hover:underline"
          >
            {dict.home.typesAll}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <ul className="mt-8 grid gap-px bg-line sm:grid-cols-3">
          {types.map((type) => {
            const text = violationText(dict, type.slug);
            const body = (
              <>
                <span
                  className={`h-1 w-10 ${typeColor(type.slug)}`}
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-lg">{text?.name ?? type.slug}</h3>
                <p className="mt-2 flex-1 text-sm text-muted">
                  {text?.summary}
                </p>
                <p className="mt-5 text-sm text-muted">
                  {type.count > 0
                    ? withCount(type.count, forms.cases, lang)
                    : dict.home.typesEmpty}
                </p>
              </>
            );

            // Пустой вид никуда не ведёт — иначе клик в пустую страницу.
            return (
              <li key={type.slug} className="bg-paper">
                {type.count > 0 ? (
                  <Link
                    href={`/${lang}/types/${type.slug}`}
                    className="flex h-full flex-col bg-surface p-6 transition-colors hover:bg-paper"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex h-full flex-col bg-surface p-6">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
