import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Dictionary, Lang } from "@/lib/i18n";

/** Первый экран: что это за место и что здесь можно сделать. */
export default function Hero({ dict, lang }: { dict: Dictionary; lang: Lang }) {
  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-10 pb-12 sm:px-6 lg:px-10 lg:pt-16">
      {/* Одной колонкой: заголовок и пояснение в двух колонках заставляли
          читать зигзагом. */}
      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl">{dict.home.title}</h1>

        <p className="mt-5 text-lg text-muted">{dict.home.lead}</p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href={`/${lang}/report`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep"
          >
            {dict.home.actionPrimary}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={`/${lang}/cases`}
            className="inline-flex h-12 items-center justify-center rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
          >
            {dict.home.actionSecondary}
          </Link>
        </div>

        {/* Про анонимность — рядом с кнопкой, а не в глубине сайта: для
            многих это условие, без которого они вообще не напишут. */}
        <p className="mt-3 text-sm text-muted">{dict.home.anonymous}</p>

        <p className="mt-8 text-base text-muted">{dict.home.slogan}</p>
      </div>
    </section>
  );
}
