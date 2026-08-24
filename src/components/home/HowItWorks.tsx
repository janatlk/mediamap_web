import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Dictionary, Lang } from "@/lib/i18n";

// Что будет после сообщения и чего мы не делаем. Второе не менее важно:
// про наказание всё равно спросят, и молчать хуже, чем сказать «не можем».
export default function HowItWorks({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: Lang;
}) {
  return (
    <>
      <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-10">
        <h2 className="text-2xl">{dict.home.howTitle}</h2>

        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {dict.home.steps.map((step, index) => (
            <li key={step.title}>
              {/* Номера тут по делу — это последовательность. */}
              <span className="font-mono text-2xs text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-lg">{step.title}</h3>
              <p className="mt-2 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 border-t border-line pt-8">
          <h3 className="text-lg">{dict.home.limitsTitle}</h3>
          <p className="mt-2 max-w-prose text-muted">{dict.home.limitsBody}</p>
        </div>
      </section>

      <section className="bg-ink text-surface">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl">{dict.home.ctaTitle}</h2>
              <p className="mt-2 text-surface/75">{dict.home.ctaBody}</p>
            </div>
            <Link
              href={`/${lang}/report`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xs bg-surface px-6 text-base font-medium text-ink transition-colors hover:bg-paper"
            >
              {dict.home.ctaAction}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
