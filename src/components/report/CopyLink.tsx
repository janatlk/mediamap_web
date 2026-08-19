"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";

// Копирование ссылки на сообщение.
//
// Пока аккаунтов нет, ссылка — единственный способ вернуться за решением.
// Адрес показан целиком и в текстовом поле: если копирование не сработает
// (старый браузер, отказ в разрешении), человек выделит его руками.

export default function CopyLink({ dict }: { dict: Dictionary }) {
  const page = dict.reportPage;
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const fieldRef = useRef<HTMLInputElement>(null);

  // Адрес берём в браузере: на сервере он неизвестен, а собирать его из
  // заголовков — лишний способ ошибиться с доменом.
  useEffect(() => setUrl(window.location.href), []);

  // Подпись «скопировано» держится пару секунд и уходит сама.
  useEffect(() => {
    if (state !== "done") return;
    const timer = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  /*
    Копируем в три ступени, от лучшего к худшему.

    Современный буфер обмена спрашивает разрешение и работает не везде:
    в старых браузерах его нет вовсе, а по незащищённому http он запрещён.
    Тогда пробуем старый execCommand — он объявлен устаревшим, но работает
    там, где новый отказал. Если и он не смог, выделяем текст и говорим
    человеку скопировать руками: адрес всё равно перед глазами.
  */
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState("done");
      return;
    } catch {
      // Переходим к запасному способу.
    }

    const field = fieldRef.current;
    field?.select();

    try {
      if (field && document.execCommand("copy")) {
        setState("done");
        return;
      }
    } catch {
      // И этот способ бывает запрещён.
    }

    setState("failed");
  };

  return (
    <section className="mt-8 border border-line bg-surface p-6">
      <h2 className="text-lg">{page.copyTitle}</h2>
      <p className="mt-2 max-w-prose text-sm text-muted">{page.copyLead}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          ref={fieldRef}
          readOnly
          value={url}
          aria-label={page.copyTitle}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 rounded-xs border border-border bg-paper px-3 py-2.5 font-mono text-xs outline-none focus:border-ink"
        />

        <button
          type="button"
          onClick={copy}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xs bg-ink px-5 text-sm font-medium text-surface"
        >
          {state === "done" ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              {page.copyDone}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              {page.copyAction}
            </>
          )}
        </button>
      </div>

      {state === "failed" ? (
        <p className="mt-2 text-sm text-signal">{page.copyFailed}</p>
      ) : null}

      <p className="mt-4 max-w-prose text-sm text-muted">
        {page.copyAccountHint}
      </p>
    </section>
  );
}
