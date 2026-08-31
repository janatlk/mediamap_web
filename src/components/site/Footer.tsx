import Link from "next/link";

import type { Dictionary, Lang } from "@/lib/i18n";

type Props = { dict: Dictionary; lang: Lang };

export default function Footer({ dict, lang }: Props) {
  const year = new Date().getFullYear();

  const links = [
    { href: `/${lang}/cases`, label: dict.nav.cases },
    { href: `/${lang}/types`, label: dict.nav.types },
    { href: `/${lang}/about`, label: dict.nav.about },
    { href: `/${lang}/contacts`, label: dict.nav.contacts },
    { href: "/admin", label: dict.footer.admin },
  ];

  return (
    /*
      Подвал был высотой почти в экран, и держали эту высоту не слова, а
      воздух: пять ссылок стояли столбиком по 44 пикселя каждая — одна
      высота ссылок давала больше двухсот пикселей пустоты. Ссылки
      выстроены в строку с переносом, отступы уменьшены. Палец по-прежнему
      попадает: высота у ссылки та же, просто теперь она не съедает
      вертикаль в одиночку.
    */
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-x-10 gap-y-4 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <p className="font-display text-base font-medium">{dict.brand}</p>
            <p className="mt-0.5 max-w-xs text-sm text-muted">
              {dict.brandTagline}
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-11 items-center text-muted transition-colors hover:text-signal"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Дисклеймер донора. Отбит линейкой и стоит над строкой с годом:
            это условие финансирования, а не приписка к копирайту.

            Читается мельче основного текста, но не мельче копирайта —
            набирать обязательство перед донором самым мелким кеглем на
            странице было бы ровно тем, чего доноры и опасаются. */}
        <p className="mt-6 max-w-3xl border-t border-line pt-5 text-xs text-muted">
          {dict.footer.disclaimer}
        </p>

        <p className="mt-3 font-mono text-2xs text-muted">
          © {year} · {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
