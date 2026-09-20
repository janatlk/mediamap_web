"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, KeyRound } from "lucide-react";

import { ACCOUNT_LIMITS } from "@/lib/account-schema";
import { isStaff } from "@/lib/enums";
import type { Dictionary } from "@/lib/i18n";
import { changePassword, type PasswordState } from "@/server/account-actions";

/*
  Смена пароля в профиле.

  Раньше пароль менялся только скриптом на сервере, то есть через
  администратора: сотрудник получал пароль в мессенджере и жил с ним.

  Форма спрятана под кнопкой: заходят сюда за историей сообщений, а пароль
  меняют раз в полгода, и два поля ввода посреди страницы только мешали бы.
  Раскрытие нативным details — работает и без JS.
*/

type Props = { dict: Dictionary; role: string };

export default function ChangePassword({ dict, role }: Props) {
  const words = dict.account;
  const [state, action] = useActionState<PasswordState, FormData>(changePassword, {});
  const form = useRef<HTMLFormElement>(null);

  // После удачной смены поля чистим: оставлять пароль в форме незачем.
  useEffect(() => {
    if (state.done) form.current?.reset();
  }, [state.done]);

  const min = isStaff(role)
    ? ACCOUNT_LIMITS.STAFF_PASSWORD_MIN
    : ACCOUNT_LIMITS.PASSWORD_MIN;

  const message = (code: string) =>
    (words.errors as Record<string, string>)[code] ?? words.errors.wrong;

  return (
    <details className="mt-10 border-t border-line pt-6">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-base [&::-webkit-details-marker]:hidden">
        <KeyRound className="h-4 w-4 text-muted" aria-hidden="true" />
        {words.passwordTitle}
      </summary>

      <form ref={form} action={action} className="mt-4 max-w-sm">
        <p className="text-sm text-muted">{words.passwordHint.replace("{n}", String(min))}</p>

        <label className="mt-4 block text-sm" htmlFor="current">
          {words.passwordCurrent}
        </label>
        <input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          className="mt-1 h-12 w-full rounded-xs border border-border bg-surface px-4 text-base"
        />

        <label className="mt-4 block text-sm" htmlFor="new-password">
          {words.passwordNew}
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={min}
          className="mt-1 h-12 w-full rounded-xs border border-border bg-surface px-4 text-base"
        />

        {state.error ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-signal">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {message(state.error)}
          </p>
        ) : null}

        {state.done ? (
          <p aria-live="polite" className="mt-3 text-sm text-muted">
            {words.passwordDone}
          </p>
        ) : null}

        <Submit label={words.passwordSave} working={words.working} />
      </form>
    </details>
  );
}

function Submit({ label, working }: { label: string; working: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep disabled:opacity-60 sm:w-auto"
    >
      {pending ? working : label}
    </button>
  );
}
