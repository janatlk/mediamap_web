"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ArrowRight } from "lucide-react";

import FilePicker from "./FilePicker";
import { LIMITS as FILE_LIMITS, megabytes } from "@/lib/attachment-rules";
import { LIMITS } from "@/lib/report-schema";
import type { Dictionary, Lang } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";
import { submitReport, type SubmitState } from "@/server/report-actions";

// Форма сообщения о нарушении.
//
// Отправляется серверным действием, а не запросом из браузера: форма
// работает и до того, как загрузится JS. Проверка целиком на сервере — это
// единственная сторона, которой можно верить.
//
// Экрана «принято» здесь нет: после записи действие уводит на отдельную
// страницу со своим адресом, который можно сохранить и открыть позже.

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

/*
  Метка «необязательно» у подписи поля.

  Обязательных полей три, необязательных тоже три, и по виду они не
  отличались: человек честно заполнял всё подряд, а на ссылку и город ему
  было нечего ответить. Помечаем необязательные — их пропускают без
  чувства, что форма недоделана.
*/
function Optional({ dict }: { dict: Dictionary }) {
  return (
    <span className="ml-2 align-middle text-sm font-normal text-muted">
      {dict.reportPage.optional}
    </span>
  );
}

/*
  Рассказ о случае со счётчиком.

  Нижняя граница в 30 знаков раньше срабатывала только после отправки:
  человек писал «оскорбили в комментариях», жал кнопку, и форма возвращала
  его назад с упрёком. Теперь видно заранее, сколько осталось, — и упрёка
  не случается вовсе.
*/
function StoryField({
  dict,
  defaultValue,
  error,
}: {
  dict: Dictionary;
  defaultValue?: string;
  error?: string;
}) {
  const page = dict.reportPage;
  const [length, setLength] = useState((defaultValue ?? "").trim().length);
  const left = LIMITS.STORY_MIN - length;

  return (
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
        defaultValue={defaultValue}
        onChange={(event) => setLength(event.target.value.trim().length)}
        className={`${inputStyle} resize-y`}
      />

      {/* Пока не начали писать, молчим: счётчик над пустым полем — это
          требование, а не помощь. */}
      {length > 0 && !error ? (
        <p className="mt-1.5 text-sm text-muted">
          {left > 0
            ? page.storyShortHint.replace("{n}", String(left))
            : page.storyOkHint}
        </p>
      ) : null}

      <FieldError text={error} />
    </div>
  );
}

const inputStyle =
  "mt-2 block w-full rounded-xs border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-ink";

export default function ReportForm({ dict, lang, types }: Props) {
  const [state, action] = useActionState<SubmitState, FormData>(submitReport, {
    status: "idle",
  });

  const page = dict.reportPage;
  /*
    Ключ ошибки может нести с собой число: "tooOften:14" — «через 14 минут».
    Всё остальное подставляем из правил, чтобы потолки не пришлось
    переписывать в двух местах — в коде и в словаре.
  */
  const message = (raw: string): string | undefined => {
    const [key, argument] = raw.split(":");
    const text = page.errors[key as keyof typeof page.errors];
    if (!text) return undefined;

    return text
      .replace("{n}", argument ?? "")
      .replace("{files}", String(FILE_LIMITS.FILES))
      .replace("{image}", String(megabytes(FILE_LIMITS.IMAGE_BYTES)))
      .replace("{video}", String(megabytes(FILE_LIMITS.VIDEO_BYTES)))
      .replace("{total}", String(megabytes(FILE_LIMITS.TOTAL_BYTES)));
  };

  const errorFor = (field: string) =>
    state.status === "error" && state.errors[field]
      ? message(state.errors[field])
      : undefined;
  const valueOf = (field: string) =>
    state.status === "error" ? state.values[field] : undefined;

  return (
    <form action={action} className="max-w-2xl" noValidate>
      <input type="hidden" name="lang" value={lang} />

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

      <StoryField
        dict={dict}
        defaultValue={valueOf("story")}
        error={errorFor("story")}
      />

      <div className="mt-8">
        <label htmlFor="link" className="text-base font-medium">
          {page.linkLabel}
          <Optional dict={dict} />
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
          <Optional dict={dict} />
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

      <div className="mt-8">
        <FilePicker dict={dict} lang={lang} />
        <FieldError text={errorFor("files")} />
      </div>

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

      {/* Ошибка про всю форму — над кнопкой, а не под ней: под кнопкой её
          не видно, когда форма длиннее экрана. */}
      <FieldError text={errorFor("form")} />

      <div className="mt-8">
        <Submit dict={dict} />
      </div>
    </form>
  );
}
