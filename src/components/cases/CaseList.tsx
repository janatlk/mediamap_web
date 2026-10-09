import Link from "next/link";

import type { CaseListItem } from "@/server/case-data";
import { formatDate } from "@/lib/format";
import { violationText, type Dictionary, type Lang } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";

// Строка списка: сначала суть, номер в конце. Человек не должен упираться
// в MM-2024-0065 раньше, чем поймёт, о чём запись.

export default function CaseList({
  cases,
  dict,
  lang,
  large = false,
}: {
  cases: CaseListItem[];
  dict: Dictionary;
  lang: Lang;
  /*
    Крупнее — на странице случаев, где список занимает всю ширину и места
    вдоволь. На главной тот же список стоит рядом с долями по видам, в
    узкой колонке, и там прежний размер к месту.
  */
  large?: boolean;
}) {
  return (
    <ul className="border-t border-line">
      {cases.map((item) => (
        <li key={item.id} className="border-b border-line">
          <Link
            href={`/${lang}/cases/${item.publicId}`}
            className={`block transition-colors hover:bg-line/40 ${large ? "py-5" : "py-4"}`}
          >
            {/* Заголовок переносится на две строки — номер при этом должен
                остаться справа, а не уезжать под точку. Отсюда flex без
                переноса: колонка с текстом сжимается, номер держит ширину. */}
            <div className="flex items-baseline gap-x-4">
              <span
                className={`flex min-w-0 flex-1 items-baseline gap-2 ${
                  large ? "text-lg" : "text-base"
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 self-start rounded-full ${typeColor(item.typeSlug)}`}
                  aria-hidden="true"
                />
                {item.headline ?? violationText(dict, item.typeSlug)?.name ?? item.typeSlug}
              </span>
              <span
                className={`shrink-0 font-mono text-muted ${large ? "text-xs" : "text-2xs"}`}
              >
                {item.publicId}
              </span>
            </div>

            {/* Площадку показываем, только если она известна. Строка
                «площадка не указана» занимала место данных и ничего не
                сообщала — отсутствие площадки и так видно по её отсутствию. */}
            <div
              className={`mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 pl-4 text-muted ${
                large ? "text-base" : "text-sm"
              }`}
            >
              {/* Вид уходит в подпись: заголовок теперь говорит, что случилось,
                  а вид — к какой полке случай отнесли. */}
              {item.headline ? (
                <>
                  <span>{violationText(dict, item.typeSlug)?.name ?? item.typeSlug}</span>
                  <span aria-hidden="true">·</span>
                </>
              ) : null}
              {item.source ? (
                <>
                  <span>{item.source}</span>
                  <span aria-hidden="true">·</span>
                </>
              ) : null}
              {item.city ? (
                <>
                  <span>{item.city}</span>
                  <span aria-hidden="true">·</span>
                </>
              ) : null}
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
