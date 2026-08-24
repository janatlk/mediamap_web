"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

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
    <button type="submit" disabled={pending}>
      {pending ? "Проверяем…" : "Войти"}
    </button>
  );
}

export default function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={action}>
      <p>
        <label htmlFor="email">Рабочая почта</label>
        <br />
        <input id="email" name="email" type="email" autoComplete="username" required size={30} />
      </p>

      <p>
        <label htmlFor="password">Пароль</label>
        <br />
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          size={30}
        />
      </p>

      {/* Не уточняем, что именно не сошлось — см. заметку выше. */}
      {state.error ? <p className="warn">{MESSAGES[state.error] ?? MESSAGES.wrong}</p> : null}

      <p>
        <Submit />
      </p>
    </form>
  );
}
