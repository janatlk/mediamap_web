"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import LanguageSwitcher from "./LanguageSwitcher";
import type { Dictionary, Lang } from "@/lib/i18n";

/**
 * Шапка сайта.
 *
 * Разбор прежней версии оставил здесь два правила. Шапка лежит ниже всего,
 * что перекрывает страницу: раньше она была выше модальных окон, и крестик
 * закрытия физически прятался под ней. И ни один элемент не меняет размер
 * от наведения: кнопка поиска раздвигалась с 40 до 240 пикселей и толкала
 * соседей.
 */

type Props = { dict: Dictionary; lang: Lang };

export default function Header({ dict, lang }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Меню закрывается при переходе: иначе на телефоне оно остаётся поверх
  // новой страницы.
  useEffect(() => setIsOpen(false), [pathname]);

  const items = [
    { href: `/${lang}/cases`, label: dict.nav.cases },
    { href: `/${lang}/types`, label: dict.nav.types },
    { href: `/${lang}/news`, label: dict.nav.news },
    { href: `/${lang}/about`, label: dict.nav.about },
    { href: `/${lang}/contacts`, label: dict.nav.contacts },
  ];

  return (
    <header className="sticky top-0 z-[100] border-b border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Link
          href={`/${lang}`}
          className="flex h-11 items-center font-display text-lg font-medium tracking-tight whitespace-nowrap"
        >
          {dict.brand}
        </Link>

        <nav className="hidden flex-1 items-center gap-7 lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`flex h-11 items-center text-sm transition-colors hover:text-signal ${
                pathname === item.href ? "text-ink" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <LanguageSwitcher
            current={lang}
            label={dict.nav.language}
            soonLabel={dict.nav.languageSoon}
          />

          <Link
            href={`/${lang}/report`}
            className="hidden h-10 items-center rounded-xs bg-signal px-4 text-sm font-medium text-surface transition-colors hover:bg-signal-deep sm:flex"
          >
            {dict.nav.report}
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            aria-expanded={isOpen}
            aria-label={isOpen ? dict.nav.close : dict.nav.menu}
            className="flex h-11 w-11 items-center justify-center rounded-xs border border-border lg:hidden"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <nav className="border-t border-line bg-paper lg:hidden">
          <ul className="mx-auto max-w-[1400px] px-4 py-2 sm:px-6">
            {items.map((item) => (
              <li key={item.href} className="border-b border-line">
                <Link href={item.href} className="block py-3.5 text-base">
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="py-3">
              <Link
                href={`/${lang}/report`}
                className="flex h-12 items-center justify-center rounded-xs bg-signal px-4 text-base font-medium text-surface"
              >
                {dict.nav.report}
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
