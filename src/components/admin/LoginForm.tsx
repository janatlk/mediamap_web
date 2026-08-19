"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";

import { signIn, type LoginState } from "@/server/auth-actions";

// Форма входа. Пароль не подсказываем и не уточняем, что именно не сошлось:
// разные ответы на «нет такого адреса» и «пароль не тот» превращают форму в
// способ узнать, какие адреса у нас заведены.

const MESSAGES: Record<string, string> = {
  empty: "Заполните оба поля",
  wrong: "Не подошло. Проверьте адрес и пароль",
};

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xs bg-ink px-6 text-base font-medium text-surface transition-opacity disabled:opacity-60"
    >
      {pending ? "Проверяем…" : "Войти"}
    </button>
  );
}

export default function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(signIn, {});

  const inputStyle =
    "mt-2 block w-full rounded-xs border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-ink";

  return (
    <form action={action}>
      <div>
        <label htmlFor="email" className="text-base font-medium">
          Рабочая почта
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={inputStyle}
        />
      </div>

      <div className="mt-6">
        <label htmlFor="password" className="text-base font-medium">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputStyle}
        />
      </div>

      {state.error ? (
        <p className="mt-6 flex items-start gap-2 text-sm text-signal">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {MESSAGES[state.error] ?? MESSAGES.wrong}
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
