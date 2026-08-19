import Link from "next/link";

import type { CaseListItem } from "@/server/case-data";
import { formatDate } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";

// Строка списка: сначала суть, номер в конце. Человек не должен упираться
// в MM-2024-0065 раньше, чем поймёт, о чём запись.

export default function CaseList({
  cases,
  dict,
  lang,
}: {
  cases: CaseListItem[];
  dict: Dictionary;
  lang: Lang;
}) {
  return (
    <ul className="border-t border-line">
      {cases.map((item) => (
        <li key={item.id} className="border-b border-line">
          <Link
            href={`/${lang}/cases/${item.publicId}`}
            className="block py-4 transition-colors hover:bg-surface"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="flex items-center gap-2 text-base">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${typeColor(item.typeSlug)}`}
                  aria-hidden="true"
                />
                {item.typeName[lang]}
              </span>
              <span className="font-mono text-2xs text-muted">
                {item.publicId}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 pl-4 text-sm text-muted">
              <span className="font-mono text-xs">
                {item.source ?? dict.home.caseSourceUnknown}
              </span>
              {item.city ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{item.city}</span>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {formatDate(item.checkedAt, lang)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
