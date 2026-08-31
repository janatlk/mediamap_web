import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Dictionary, Lang } from "@/lib/i18n";

/*
  Призыв написать нам.

  Раньше жил внутри HowItWorks — блок «что будет после» кончался кнопкой, и
  это было логично. Теперь порядок на главной другой: сначала зовём, потом
  объясняем, что будет дальше. Держать в одном компоненте два раздела,
  которые стоят в разных местах страницы, нельзя, поэтому призыв вынесен.
*/
export default function ReportCta({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: Lang;
}) {
  return (
    <section className="bg-deep text-surface">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* Цвет задан прямо, и это не лишнее. Заголовкам в globals.css
                назначен свой цвет — тёмный, для светлых страниц, — и он
                сильнее унаследованного от секции. На тёмной плашке
                заголовок из-за этого пропадал. */}
            <h2 className="text-2xl text-surface">{dict.home.ctaTitle}</h2>
            <p className="mt-2 text-surface/75">{dict.home.ctaBody}</p>
          </div>
          <Link
            href={`/${lang}/report`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xs bg-surface px-6 text-base font-medium text-deep transition-colors hover:bg-paper"
          >
            {dict.home.ctaAction}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
