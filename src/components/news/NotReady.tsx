"use client";

import { useEffect, useRef } from "react";
import { Wrench, X } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";

/*
  Окно «в разработке».

  Перевод новостей работал на своей модели, но она держала три гигабайта
  памяти и тем определяла, где всему проекту жить. На время демонстрации
  перевод отключён, а кнопки оставлены: по ним видно, что задумано, и их не
  придётся возвращать на место потом.

  Честнее было бы кнопки убрать совсем — тогда человек не тратит нажатие
  впустую. Но на показе заказчику важно, чтобы замысел читался целиком, и
  прямая надпись «в разработке» тут не обманывает: она ровно об этом.
*/

type Props = { dict: Dictionary; onClose: () => void };

export default function NotReady({ dict, onClose }: Props) {
  const words = dict.newsPage;
  const close = useRef<HTMLButtonElement>(null);

  /*
    Фокус переводим на кнопку закрытия, а Escape закрывает окно.

    Без этого тот, кто ходит по странице с клавиатуры, нажал бы «Перевести» и
    остался стоять где стоял: окно всплыло, а табуляция продолжает гулять по
    ленте под ним.
  */
  useEffect(() => {
    close.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="not-ready-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 backdrop-blur-[2px]"
      // Щелчок мимо окна закрывает его — обычное ожидание от всплывающего.
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm border border-line bg-surface px-8 py-8 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <Wrench className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />

        <p id="not-ready-title" className="mt-5 text-lg">
          {words.translateSoonTitle}
        </p>
        <p className="mt-2 text-sm text-muted">{words.translateSoonLead}</p>

        <button
          ref={close}
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xs border border-border px-5 text-base transition-colors hover:bg-paper"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {words.translateSoonClose}
        </button>
      </div>
    </div>
  );
}
