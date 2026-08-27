"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogIn, Menu, Search, UserRound, X } from "lucide-react";

import LanguageSwitcher from "./LanguageSwitcher";
import type { Dictionary, Lang } from "@/lib/i18n";

// Два правила, оба выстраданы на старом сайте:
// 1. Шапка ниже всего, что перекрывает страницу. Была выше модалок —
//    крестик закрытия физически прятался под ней.
// 2. Ничего не меняет размер от наведения. Кнопка поиска разъезжалась
//    с 40 до 240px и толкала соседей. Поэтому поиск здесь — значок-ссылка
//    на отдельную страницу, а не поле, растущее на месте.
//
// Рубрик стало десять, и в строку они не встают: на 1024px после названия,
// поиска, языка, входа и красной кнопки под них остаётся около пятисот
// точек. Поэтому на виду только частые, остальные — под «Ещё».
//
// Частых три или четыре, смотря по ширине: «Медиа-дайджест» — самая длинная
// подпись, и на 1024 она была лишней. Ровно на ней красная кнопка ломалась
// на две строки и распирала шапку выше её шестнадцати единиц — та же беда,
// которую уже чинили на телефоне. Поэтому кнопке запрещено переноситься, а
// дайджест до 1280 живёт в «Ещё».
//
// В меню на телефоне никакого «Ещё» нет: там места по вертикали сколько
// угодно, и прятать половину сайта во второй уровень незачем.

type Account = { name: string; staff: boolean } | null;

type Props = { dict: Dictionary; lang: Lang; account: Account };

export default function Header({ dict, lang, account }: Props) {
  // Сотрудника ведём в панель, остальных — в кабинет заявителя: это разные
  // места, и путать их незачем.
  const accountHref = account?.staff ? "/admin" : `/${lang}/account`;
  const accountLabel = account?.staff ? dict.nav.panel : dict.nav.account;
  const [isOpen, setIsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Иначе на телефоне меню висит поверх новой страницы.
  useEffect(() => {
    setIsOpen(false);
    setIsMoreOpen(false);
  }, [pathname]);

  /*
    «Ещё» закрывается щелчком мимо и клавишей Escape.

    Без первого оно остаётся висеть, когда человек передумал и нажал в
    пустоту; без второго его нечем закрыть с клавиатуры, а туда уходит
    половина разделов сайта.
  */
  useEffect(() => {
    if (!isMoreOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setIsMoreOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMoreOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMoreOpen]);

  const primary = [
    { href: `/${lang}/cases`, label: dict.nav.cases },
    { href: `/${lang}/types`, label: dict.nav.types },
    { href: `/${lang}/analytics`, label: dict.nav.analytics },
  ];

  /** Показывается в строке только с 1280 — ниже уезжает в «Ещё». */
  const wide = { href: `/${lang}/news`, label: dict.nav.news };

  const secondary = [
    { href: `/${lang}/resources`, label: dict.nav.resources },
    { href: `/${lang}/glossary`, label: dict.nav.glossary },
    { href: `/${lang}/quiz`, label: dict.nav.quiz },
    { href: `/${lang}/about`, label: dict.nav.about },
    { href: `/${lang}/contacts`, label: dict.nav.contacts },
  ];

  const linkClass = (href: string) =>
    `flex h-11 items-center text-sm transition-colors hover:text-signal ${
      pathname === href ? "text-ink" : "text-muted"
    }`;

  return (
    <header className="sticky top-0 z-[100] border-b border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Link
          href={`/${lang}`}
          className="flex h-11 items-center font-display text-lg font-medium tracking-tight whitespace-nowrap"
        >
          {dict.brand}
        </Link>

        <nav className="hidden flex-1 items-center gap-6 lg:flex">
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`${linkClass(item.href)} whitespace-nowrap`}
            >
              {item.label}
            </Link>
          ))}

          <Link
            href={wide.href}
            aria-current={pathname === wide.href ? "page" : undefined}
            className={`${linkClass(wide.href)} hidden whitespace-nowrap xl:flex`}
          >
            {wide.label}
          </Link>

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen((value) => !value)}
              aria-expanded={isMoreOpen}
              className="flex h-11 items-center gap-1 text-sm text-muted transition-colors hover:text-signal"
            >
              {dict.nav.more}
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>

            {isMoreOpen ? (
              <ul className="absolute top-full left-0 min-w-52 border border-line bg-paper py-1 shadow-sm">
                {[wide, ...secondary].map((item) => (
                  <li key={item.href} className={item === wide ? "xl:hidden" : ""}>
                    <Link
                      href={item.href}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className="flex min-h-11 items-center px-4 text-sm whitespace-nowrap transition-colors hover:text-signal"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            href={`/${lang}/search`}
            title={dict.nav.search}
            className="flex h-11 w-11 items-center justify-center rounded-xs border border-border transition-colors hover:bg-surface"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{dict.nav.search}</span>
          </Link>

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
            className="hidden h-11 items-center rounded-xs bg-signal px-4 text-sm font-medium whitespace-nowrap text-surface transition-colors hover:bg-signal-deep sm:flex"
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
            {[...primary, wide, ...secondary].map((item) => (
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
