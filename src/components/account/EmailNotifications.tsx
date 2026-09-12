"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";
import { setEmailNotifications } from "@/server/account-actions";

/*
  Настройка писем о решении по своим заявкам.

  Сохраняется сразу по щелчку, без кнопки «Сохранить»: настройка одна и
  переключается редко, а кнопка рядом с единственной галкой — лишний шаг,
  про который забывают, уходя со страницы.

  Форма настоящая: без JS галка отправится кнопкой, которая видна только
  тогда, когда JS не сработал.
*/

type Props = { dict: Dictionary; enabled: boolean };

export default function EmailNotifications({ dict, enabled }: Props) {
  const words = dict.account;
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={setEmailNotifications}
      className="mt-10 border-t border-line pt-6"
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="notify"
          defaultChecked={enabled}
          onChange={(event) => {
            setSaved(false);
            event.currentTarget.form?.requestSubmit();
            // Подтверждение показываем сразу: запрос уходит мгновенно, а
            // человеку нужен ответ на его щелчок, а не тишина.
            setSaved(true);
          }}
          className="mt-1 h-4 w-4 shrink-0 accent-ink"
        />
        <span>
          <span className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-muted" aria-hidden="true" />
            {words.notifyLabel}
          </span>
          <span className="mt-1 block text-sm text-muted">
            {words.notifyHint}
          </span>
        </span>
      </label>

      {/* Виден, только если JS не сработал: тогда галка сама ничего не
          отправит, и без кнопки настройку было бы не сохранить. */}
      <noscript>
        <button
          type="submit"
          className="mt-3 inline-flex h-11 items-center rounded-xs border border-border px-5 text-sm"
        >
          {words.notifySave}
        </button>
      </noscript>

      {saved ? (
        <p aria-live="polite" className="mt-2 text-sm text-muted">
          {words.notifySaved}
        </p>
      ) : null}
    </form>
  );
}
