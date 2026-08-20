"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";

import { ACCOUNT_LIMITS } from "@/lib/account-schema";
import type { Dictionary, Lang } from "@/lib/i18n";
import { listSaved } from "@/lib/my-reports";
import {
  adoptReports,
  register,
  signInAccount,
  type AccountState,
} from "@/server/account-actions";

// Вход и регистрация заявителя. Одна форма на два случая — поля те же,
// различаются заголовок, кнопка и действие.

type Props = {
  dict: Dictionary;
  lang: Lang;
  mode: "login" | "register";
  providers: { id: string; label: string }[];
  /** Ошибка, с которой вернул чужой сервис. */
  externalError?: string;
};

function Submit({ label, working }: { label: string; working: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep disabled:opacity-60"
    >
      {pending ? working : label}
    </button>
  );
}

const inputStyle =
  "mt-2 block w-full rounded-xs border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-ink";

export default function AccountForm({
  dict,
  lang,
  mode,
  providers,
  externalError,
}: Props) {
  const page = dict.account;
  const isRegister = mode === "register";

  const [state, action] = useActionState<AccountState, FormData>(
    isRegister ? register : signInAccount,
    {},
  );

  /*
    После входа привязываем к аккаунту сообщения, поданные раньше анонимно
    с этого браузера. Ключи знает только их автор, поэтому присвоить чужое
    нельзя, а свои сообщения не теряются при заведении аккаунта.

    Действие уводит на страницу аккаунта, так что этот код срабатывает уже
    там — при монтировании формы он безвреден.
  */
  useEffect(() => {
    const tokens = listSaved().map((item) => item.token);
    if (tokens.length > 0) void adoptReports(tokens);
  }, []);

  const errorKey = state.error ?? externalError;
  const errorText = errorKey
    ? (page.errors[errorKey as keyof typeof page.errors] ?? page.errors.wrong)
    : null;

  return (
    <>
      {providers.length > 0 ? (
        <>
          <div className="space-y-3">
            {providers.map((provider) => (
              // Обычная ссылка, а не форма: переход уводит на чужой сайт.
              <a
                key={provider.id}
                href={`/api/auth/${provider.id}`}
                className="flex h-12 items-center justify-center rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
              >
                {page.withProvider} {provider.label}
              </a>
            ))}
          </div>

          <div className="my-8 flex items-center gap-4">
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
            <span className="text-sm text-muted">{page.orDivider}</span>
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
          </div>
        </>
      ) : null}

      <form action={action}>
        <div>
          <label htmlFor="email" className="text-base font-medium">
            {page.emailLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.email}
            required
            className={inputStyle}
          />
        </div>

        <div className="mt-6">
          <label htmlFor="password" className="text-base font-medium">
            {page.passwordLabel}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? ACCOUNT_LIMITS.PASSWORD_MIN : undefined}
            required
            className={inputStyle}
          />
        </div>

        {isRegister ? (
          <div className="mt-6">
            <label htmlFor="name" className="text-base font-medium">
              {page.nameLabel}
            </label>
            <p className="mt-1 text-sm text-muted">{page.nameHint}</p>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={ACCOUNT_LIMITS.NAME_MAX}
              className={inputStyle}
            />
          </div>
        ) : null}

        {errorText ? (
          <p className="mt-6 flex items-start gap-2 text-sm text-signal">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {errorText}
          </p>
        ) : null}

        <Submit
          label={isRegister ? page.signUp : page.signIn}
          working={page.working}
        />
      </form>

      <div className="mt-8 space-y-2 text-sm">
        <p className="text-muted">
          {isRegister ? page.haveAccount : page.noAccount}{" "}
          <Link
            href={`/${lang}/account/${isRegister ? "login" : "register"}`}
            className="text-signal hover:underline"
          >
            {isRegister ? page.signIn : page.signUp}
          </Link>
        </p>
        <p>
          <Link
            href={`/${lang}/report`}
            className="text-muted hover:text-signal"
          >
            {page.anonymous}
          </Link>
        </p>
      </div>
    </>
  );
}
