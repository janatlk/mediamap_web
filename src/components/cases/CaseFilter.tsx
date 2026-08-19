import Link from "next/link";

import type { ViolationType } from "@/server/violations";
import type { Dictionary, Lang } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";

// Фильтр ссылками, а не кнопками с состоянием: выбранный вид попадает в
// адрес, значит страницу можно переслать и открыть заново тем же видом.
// Заодно всё остаётся серверным — клиентский JS для этого не нужен.

type Props = {
  dict: Dictionary;
  lang: Lang;
  types: ViolationType[];
  active?: string;
};

export default function CaseFilter({ dict, lang, types, active }: Props) {
  const base = `/${lang}/cases`;

  const chip = (isActive: boolean) =>
    `inline-flex h-10 items-center gap-2 rounded-xs border px-4 text-sm transition-colors ${
      isActive
        ? "border-ink bg-ink text-surface"
        : "border-border hover:bg-surface"
    }`;

  return (
    <nav aria-label={dict.cases.filterLabel}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link href={base} className={chip(!active)}>
            {dict.cases.filterAll}
          </Link>
        </li>

        {types.map((type) => {
          const isActive = active === type.slug;
          return (
            <li key={type.slug}>
              <Link
                href={`${base}?type=${type.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={chip(isActive)}
              >
                <span
                  className={`h-2 w-2 rounded-full ${typeColor(type.slug)}`}
                  aria-hidden="true"
                />
                {type.name[lang]}
                <span className="font-mono text-2xs opacity-70">
                  {type.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
