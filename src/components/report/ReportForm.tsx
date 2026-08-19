"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ArrowRight, Check } from "lucide-react";

import AssessmentCard from "./AssessmentCard";
import { LIMITS } from "@/lib/report-schema";
import type { Dictionary, Lang } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";
import { submitReport, type SubmitState } from "@/server/report-actions";

// Форма сообщения о нарушении.
//
// Отправляется серверным действием, а не запросом из браузера: форма
// работает и до того, как загрузится JS. Проверка целиком на сервере — это
// единственная сторона, которой можно верить.

type Props = {
  dict: Dictionary;
  lang: Lang;
  types: { slug: string; name: string }[];
};

/** Кнопка знает, что отправка идёт, и не даёт нажать себя дважды. */
function Submit({ dict }: { dict: Dictionary }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep disabled:opacity-60"
    >
      {pending ? dict.reportPage.submitting : dict.reportPage.submit}
      {pending ? null : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

/** Сообщение об ошибке под полем. Красный тут значит ошибку, не действие. */
function FieldError({ text }: { text?: string }) {
  if (!text) return null;

  return (
    // Не только цветом: значок и текст остаются видны тем, кто цвет не
    // различает, и тем, кто читает страницу с экрана.
    <p className="mt-1.5 flex items-start gap-1.5 text-sm text-signal">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

const inputStyle =
  "mt-2 block w-full rounded-xs border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-ink";

export default function ReportForm({ dict, lang, types }: Props) {
  const [state, action] = useActionState<SubmitState, FormData>(submitReport, {
    status: "idle",
  });

  const page = dict.reportPage;
  const errorFor = (field: string) =>
    state.status === "error"
      ? page.errors[state.errors[field] as keyof typeof page.errors]
      : undefined;
  const valueOf = (field: string) =>
    state.status === "error" ? state.values[field] : undefined;

  if (state.status === "done") {
    return (
      <div className="max-w-4xl">
        <h1 className="flex items-center gap-3 text-3xl sm:text-4xl">
          <Check className="h-7 w-7 text-signal" aria-hidden="true" />
          {page.doneTitle}
        </h1>
        <p className="mt-4 text-lg text-muted">{page.doneLead}</p>

        <div className="mt-8 border border-line bg-surface p-6">
          <p className="text-sm text-muted">{page.doneNumber}</p>
          <p className="mt-1 font-mono text-2xl">{state.publicId}</p>
          <p className="mt-4 text-sm text-muted">{page.doneKeep}</p>
        </div>

        <AssessmentCard
          dict={dict}
          assessment={state.assessment}
          chosenType={state.chosenType}
        />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/${lang}/report`}
            className="inline-flex h-12 items-center justify-center rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
          >
            {page.doneAnother}
          </Link>
          <Link
            href={`/${lang}/cases`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xs bg-ink px-6 text-base font-medium text-surface"
          >
            {page.doneToCases}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="max-w-2xl" noValidate>
      {/* Ловушка для роботов: спрятана от людей, но видна автозаполнялкам. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label>
          Не заполняйте это поле
          <input type="text" name="trap" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend className="text-base font-medium">{page.typeLabel}</legend>
        <p className="mt-1 text-sm text-muted">{page.typeHint}</p>

        <div className="mt-3 space-y-2">
          {types.map((type) => (
            <label
              key={type.slug}
              className="flex cursor-pointer items-center gap-3 rounded-xs border border-border bg-surface px-4 py-3 transition-colors hover:bg-paper has-checked:border-ink"
            >
              <input
                type="radio"
                name="typeSlug"
                value={type.slug}
                defaultChecked={valueOf("typeSlug") === type.slug}
                className="h-4 w-4 accent-ink"
              />
              <span
                className={`h-2 w-2 rounded-full ${typeColor(type.slug)}`}
                aria-hidden="true"
              />
              <span className="text-base">{type.name}</span>
            </label>
          ))}
        </div>
        <FieldError text={errorFor("typeSlug")} />
      </fieldset>

      <div className="mt-8">
        <label htmlFor="story" className="text-base font-medium">
          {page.storyLabel}
        </label>
        <p className="mt-1 text-sm text-muted">{page.storyHint}</p>
        <textarea
          id="story"
          name="story"
          rows={7}
          maxLength={LIMITS.STORY_MAX}
          defaultValue={valueOf("story")}
          className={`${inputStyle} resize-y`}
        />
        <FieldError text={errorFor("story")} />
      </div>

      <div className="mt-8">
        <label htmlFor="link" className="text-base font-medium">
          {page.linkLabel}
        </label>
        <p className="mt-1 text-sm text-muted">{page.linkHint}</p>
        <input
          id="link"
          name="link"
          type="url"
          inputMode="url"
          placeholder={page.linkPlaceholder}
          defaultValue={valueOf("link")}
          className={inputStyle}
        />
        <FieldError text={errorFor("link")} />
      </div>

      <div className="mt-8">
        <label htmlFor="city" className="text-base font-medium">
          {page.cityLabel}
        </label>
        <p className="mt-1 text-sm text-muted">{page.cityHint}</p>
        <input
          id="city"
          name="city"
          type="text"
          maxLength={LIMITS.CITY_MAX}
          defaultValue={valueOf("city")}
          className={inputStyle}
        />
        <FieldError text={errorFor("city")} />
      </div>

      {/* Про скриншот говорим прямо, а не молчим: человек будет искать
          кнопку прикрепления и решит, что она сломалась. */}
      <p className="mt-8 border-l-2 border-line pl-4 text-sm text-muted">
        {page.noScreenshot}
      </p>

      <div className="mt-8 border-t border-line pt-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            className="mt-1 h-4 w-4 shrink-0 accent-ink"
          />
          <span>
            <span className="text-base">{page.consentLabel}</span>
            <span className="mt-1 block text-sm text-muted">
              {page.consentHint}
            </span>
          </span>
        </label>
        <FieldError text={errorFor("consent")} />
      </div>

      <div className="mt-8">
        <Submit dict={dict} />
      </div>
    </form>
  );
}
