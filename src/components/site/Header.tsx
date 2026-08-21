"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn, Menu, UserRound, X } from "lucide-react";

import LanguageSwitcher from "./LanguageSwitcher";
import type { Dictionary, Lang } from "@/lib/i18n";

// Два правила, оба выстраданы на старом сайте:
// 1. Шапка ниже всего, что перекрывает страницу. Была выше модалок —
//    крестик закрытия физически прятался под ней.
// 2. Ничего не меняет размер от наведения. Кнопка поиска разъезжалась
//    с 40 до 240px и толкала соседей.

type Account = { name: string; staff: boolean } | null;

type Props = { dict: Dictionary; lang: Lang; account: Account };

export default function Header({ dict, lang, account }: Props) {
  // Сотрудника ведём в панель, остальных — в кабинет заявителя: это разные
  // места, и путать их незачем.
  const accountHref = account?.staff ? "/admin" : `/${lang}/account`;
  const accountLabel = account?.staff ? dict.nav.panel : dict.nav.account;
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Иначе на телефоне меню висит поверх новой страницы.
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

          {/* Подпись прячем на узких экранах: значка хватает, а место в
              шапке дороже. */}
          <Link
            href={account ? accountHref : `/${lang}/account/login`}
            className="flex h-11 items-center gap-2 rounded-xs border border-border px-3 text-sm transition-colors hover:bg-surface"
            title={account ? account.name : dict.nav.signIn}
          >
            {account ? (
              <UserRound className="h-4 w-4" aria-hidden="true" />
            ) : (
              <LogIn className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden xl:inline">
              {account ? accountLabel : dict.nav.signIn}
            </span>
          </Link>

          <Link
            href={`/${lang}/report`}
            className="hidden h-11 items-center rounded-xs bg-signal px-4 text-sm font-medium text-surface transition-colors hover:bg-signal-deep sm:flex"
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
            <li className="border-b border-line">
              <Link
                href={account ? accountHref : `/${lang}/account/login`}
                className="flex items-center gap-2 py-3.5 text-base"
              >
                {account ? (
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                )}
                {account ? accountLabel : dict.nav.signIn}
              </Link>
            </li>

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
