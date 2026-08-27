import Link from "next/link";

import type { Dictionary, Lang } from "@/lib/i18n";

/*
  Футер держит карту сайта целиком.

  Это не украшение и не дубль шапки: в шапке половина рубрик спрятана под
  «Ещё», и футер — единственное место, где весь сайт виден разом. Отсюда
  три колонки по смыслу, а не один столбец ссылок: «что мы собрали»,
  «что почитать», «о нас».
*/

type Props = { dict: Dictionary; lang: Lang };

export default function Footer({ dict, lang }: Props) {
  const year = new Date().getFullYear();

  const columns = [
    [
      { href: `/${lang}/cases`, label: dict.nav.cases },
      { href: `/${lang}/types`, label: dict.nav.types },
      { href: `/${lang}/analytics`, label: dict.nav.analytics },
      { href: `/${lang}/report`, label: dict.nav.report },
    ],
    [
      { href: `/${lang}/news`, label: dict.nav.news },
      { href: `/${lang}/glossary`, label: dict.nav.glossary },
      { href: `/${lang}/resources`, label: dict.nav.resources },
      { href: `/${lang}/quiz`, label: dict.nav.quiz },
    ],
    [
      { href: `/${lang}/about`, label: dict.nav.about },
      { href: `/${lang}/contacts`, label: dict.nav.contacts },
      { href: `/${lang}/search`, label: dict.nav.search },
      { href: "/admin", label: dict.footer.admin },
    ],
  ];

  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-base font-medium">{dict.brand}</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              {dict.brandTagline}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 sm:grid-cols-3">
            {columns.map((column) => (
              <nav key={column[0].href} className="flex flex-col text-sm">
                {column.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex min-h-11 items-center whitespace-nowrap text-muted transition-colors hover:text-signal"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 font-mono text-2xs text-muted">
          © {year} · {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
