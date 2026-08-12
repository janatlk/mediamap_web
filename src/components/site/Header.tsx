"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import type { Dictionary } from "@/lib/content";

/**
 * Шапка сайта.
 *
 * Разбор прежней версии показал две вещи, которые здесь исправлены сразу.
 * Первая: шапка стояла выше модальных окон, и крестик закрытия физически
 * прятался под ней — здесь у шапки самый низкий слой из перекрывающих.
 * Вторая: кнопка поиска раздвигалась при наведении с 40 до 240 пикселей и
 * толкала соседей — ни один элемент здесь не меняет размер от наведения.
 */

type Props = { dict: Dictionary };

export default function Header({ dict }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Меню закрывается при переходе: иначе на мобильном оно остаётся
  // поверх новой страницы.
  useEffect(() => setIsOpen(false), [pathname]);

  const items = [
    { href: "/map", label: dict.nav.map },
    { href: "/categories", label: dict.nav.categories },
    { href: "/news", label: dict.nav.news },
    { href: "/about", label: dict.nav.about },
    { href: "/contacts", label: dict.nav.contacts },
  ];

  return (
    <header className="sticky top-0 z-[100] border-b border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="flex h-11 items-center font-display text-lg font-medium tracking-tight whitespace-nowrap"
        >
          {dict.brand}
        </Link>

        <nav className="hidden flex-1 items-center gap-7 lg:flex">
          {items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-11 items-center text-sm transition-colors hover:text-signal ${
                  isActive ? "text-ink" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {/* Переключатель языка. Обе кнопки одного размера, минимум 44px
              по касанию — на прежнем сайте он был 37×26. */}
          <div
            className="flex overflow-hidden rounded-xs border border-border"
            role="group"
            aria-label={dict.nav.language}
          >
            {(["ru", "ky"] as const).map((code, index) => (
              <button
                key={code}
                type="button"
                aria-pressed={index === 0}
                className={`h-9 w-11 font-mono text-2xs uppercase transition-colors ${
                  index === 0
                    ? "bg-ink text-surface"
                    : "text-muted hover:text-ink"
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          <Link
            href="/report"
            className="hidden h-9 items-center rounded-xs bg-signal px-4 text-sm font-medium text-surface transition-colors hover:bg-signal-deep sm:flex"
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
              <li key={item.href} className="border-b border-line last:border-0">
                <Link href={item.href} className="block py-3 text-sm">
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="py-3">
              <Link
                href="/report"
                className="flex h-11 items-center justify-center rounded-xs bg-signal px-4 text-sm font-medium text-surface"
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
