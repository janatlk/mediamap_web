"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { LANGUAGES, type Lang } from "@/lib/i18n";

/**
 * Выбор языка.
 *
 * Пять языков в ряд кнопками не помещаются, поэтому список раскрывается.
 * Неготовые языки видно сразу — так понятно, что работа идёт, — но выбрать
 * их нельзя: обещать язык и отдать пустые строки хуже, чем сказать «скоро».
 */

type Props = {
  current: Lang;
  label: string;
  soonLabel: string;
};

/** Путь без языкового префикса: /ru/about → /about */
const pathWithoutLang = (pathname: string): string => {
  const [, , ...rest] = pathname.split("/");
  return rest.length ? `/${rest.join("/")}` : "";
};

/** Закрывает список по нажатию вне его и по Esc. */
function useDismiss(onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onDismiss]);

  return ref;
}

export default function LanguageSwitcher({ current, label, soonLabel }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const ref = useDismiss(() => setIsOpen(false));

  const rest = pathWithoutLang(pathname);
  const active = LANGUAGES.find((language) => language.code === current);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={label}
        className="flex h-10 items-center gap-1.5 rounded-xs border border-border px-3 text-sm transition-colors hover:bg-surface"
      >
        <span className="font-mono text-2xs">{active?.short}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
      </button>

      {isOpen ? (
        <ul
          // Список выше шапки: иначе он уезжает под неё на узких экранах.
          className="absolute right-0 z-[200] mt-1 w-52 border border-line bg-surface py-1 shadow-lg"
        >
          {LANGUAGES.map((language) => {
            const isCurrent = language.code === current;

            if (!language.ready) {
              return (
                <li
                  key={language.code}
                  className="flex items-center justify-between px-3 py-2.5 text-sm text-muted"
                >
                  <span>{language.name}</span>
                  <span className="font-mono text-2xs">{soonLabel}</span>
                </li>
              );
            }

            return (
              <li key={language.code}>
                <Link
                  href={`/${language.code}${rest}`}
                  onClick={() => setIsOpen(false)}
                  aria-current={isCurrent ? "true" : undefined}
                  className="flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-paper"
                >
                  <span>{language.name}</span>
                  {isCurrent ? (
                    <Check className="h-4 w-4 text-signal" aria-hidden="true" />
                  ) : (
                    <span className="font-mono text-2xs text-muted">
                      {language.short}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
