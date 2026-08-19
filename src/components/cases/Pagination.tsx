import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";

// Ссылками, а не кнопками: страница живёт в адресе, её можно переслать и
// открыть в новой вкладке. Края списка не прячем — показываем неактивными,
// иначе кнопки прыгают при переходе на первую и последнюю страницу.

type Props = {
  dict: Dictionary;
  page: number;
  pageCount: number;
  /** Адрес без номера страницы, уже с фильтром, если он выбран. */
  hrefFor: (page: number) => string;
};

export default function Pagination({ dict, page, pageCount, hrefFor }: Props) {
  if (pageCount <= 1) return null;

  const style =
    "inline-flex h-10 items-center gap-2 rounded-xs border border-border px-4 text-sm transition-colors hover:bg-surface";
  const disabled =
    "inline-flex h-10 items-center gap-2 rounded-xs border border-line px-4 text-sm text-muted";

  return (
    <nav className="mt-8 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={style} rel="prev">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {dict.cases.prev}
        </Link>
      ) : (
        <span className={disabled} aria-disabled="true">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {dict.cases.prev}
        </span>
      )}

      <span className="font-mono text-sm tabular-nums text-muted">
        {page} {dict.cases.pageOf} {pageCount}
      </span>

      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={style} rel="next">
          {dict.cases.next}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={disabled} aria-disabled="true">
          {dict.cases.next}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
