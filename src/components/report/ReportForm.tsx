"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ArrowRight } from "lucide-react";

import FilePicker from "./FilePicker";
import { LIMITS as FILE_LIMITS, megabytes } from "@/lib/attachment-rules";
import { LIMITS, today } from "@/lib/report-schema";
import type { Dictionary, Lang } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";
import { submitReport, type SubmitState } from "@/server/report-actions";
import Sending from "./Sending";

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

/**
 * Ждём ли мы ответа дольше, чем человек успевает заметить.
 *
 * Окно ожидания нельзя показывать сразу: незаполненная форма возвращается с
 * ошибкой за доли секунды, и окно успевало моргнуть — выходило, что сообщение
 * будто бы отправлялось, хотя его развернули на проверке.
 */
function useSlowRequest(pending: boolean): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 600);
    return () => clearTimeout(timer);
  }, [pending]);

  return slow;
}

/**
 * Кнопка знает, что отправка идёт, и не даёт нажать себя дважды.
 *
 * Она же поднимает окошко ожидания: разбор занимает до пятнадцати секунд, и
 * потускневшей кнопки на такой срок мало — человек не понимает, ушло у него
 * сообщение или страница сломалась.
 */
function Submit({ dict }: { dict: Dictionary }) {
  const { pending } = useFormStatus();
  const waiting = useSlowRequest(pending);

  return (
    <>
      {waiting ? <Sending dict={dict} /> : null}
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep disabled:opacity-60"
    >
      {pending ? dict.reportPage.submitting : dict.reportPage.submit}
      {pending ? null : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
    </button>
    </>
  );
}

/*
  Сообщение об ошибке под полем. Красный тут значит ошибку, не действие.

  Вслух не объявляем: браузер и так прочитает её, когда человек дойдёт до
  поля. Четыре сообщения, заговорившие разом, слышны как одно неразборчивое.

  id нужен полю: оно ссылается сюда через aria-describedby, и тогда ошибка
  читается вместе с подписью, когда человек до поля доходит.
*/
function FieldError({ text, id }: { text?: string; id?: string }) {
  if (!text) return null;

  return (
    // Не только цветом: значок и текст остаются видны тем, кто цвет не
    // различает, и тем, кто читает страницу с экрана.
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-signal">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

/*
  Сообщение об ошибке, которая не про поле: слишком частая отправка, отказ
  хранилища. Раньше над формой висела красная сводка «Сообщение не
  отправилось» со списком ссылок на поля — на пустую форму она читалась как
  выговор, хотя человек просто не дозаполнил.

  Про поля теперь говорят сами поля: рамка краснеет, под ней строка с
  причиной. А сюда попадает только то, что человек в форме не увидит.
*/
function FormNotice({ text }: { text?: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (text) box.current?.focus();
  }, [text]);

  if (!text) return null;

  return (
    <div
      ref={box}
      tabIndex={-1}
      role="alert"
      className="mb-8 flex items-start gap-2 border-l-2 border-signal bg-surface px-5 py-4 text-base outline-none"
    >
      <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
      {text}
    </div>
  );
}

/** Пояснение под подписью. Пустое — значит подпись справилась сама. */
function Hint({ text }: { text: string }) {
  if (!text) return null;
  return <p className="mt-1 text-sm text-muted">{text}</p>;
}

/*
  Звёздочка у обязательного поля.

  Раньше было наоборот: три необязательных поля носили подпись
  «необязательно». Слово рядом с каждой второй подписью читалось как шум, а
  главного — что именно надо заполнить обязательно — по-прежнему не было
  видно. Звёздочка короче и помечает меньшинство.

  aria-hidden, потому что вслух её читают как «звёздочка» и это ничего не
  объясняет; для чтения с экрана обязательность несёт aria-required у поля.
*/
function Required() {
  return (
    <span className="ml-1 align-middle text-signal" aria-hidden="true">
      *
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
        <Required />
      </label>
      <Hint text={page.storyHint} />
      <textarea
        id="story"
        placeholder={page.storyPlaceholder}
        name="story"
        rows={7}
        maxLength={LIMITS.STORY_MAX}
        defaultValue={defaultValue}
        onChange={(event) => setLength(event.target.value.trim().length)}
        aria-describedby={error ? "story-error" : "story-count"}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        className={`${fieldStyle(Boolean(error))} resize-y`}
      />

      {/* Пока не начали писать, молчим: счётчик над пустым полем — это
          требование, а не помощь. */}
      {length > 0 && !error ? (
        // Живая, но вежливая: сообщает по готовности, не перебивая набор.
        <p id="story-count" aria-live="polite" className="mt-1.5 text-sm text-muted">
          {left > 0
            ? page.storyShortHint.replace("{n}", String(left))
            : page.storyOkHint}
        </p>
      ) : null}

      <FieldError text={error} id="story-error" />
    </div>
  );
}

const inputStyle =
  "mt-2 block w-full rounded-xs border bg-surface px-3 py-2.5 text-base outline-none focus:border-ink";

/*
  Рамка поля. Обычная — серая, у поля с ошибкой — красная и вдвое толще.

  Толщина важна: одним цветом отличие видит не каждый, и на плохом мониторе
  красная рамка в один пиксель почти не отличается от серой. Смысл всё равно
  несёт не она, а строка с причиной под полем.
*/
const fieldStyle = (invalid: boolean) =>
  `${inputStyle} ${invalid ? "border-2 border-signal" : "border-border"}`;

export default function ReportForm({ dict, lang, types }: Props) {
  const [state, action] = useActionState<SubmitState, FormData>(submitReport, {
    status: "idle",
  });

  const page = dict.reportPage;
  /*
    Ключ ошибки может нести с собой число: "tooOften:30" — пауза в секундах.
    Короткую паузу называем секундами, длинную — минутами: «через 900 с»
    человек в уме не переводит.

    Всё остальное подставляем из правил, чтобы потолки не пришлось
    переписывать в двух местах — в коде и в словаре.
  */
  const message = (raw: string): string | undefined => {
    const [key, argument] = raw.split(":");
    const seconds = Number(argument);

    if (key === "tooOften" && Number.isFinite(seconds)) {
      return seconds < 90
        ? page.errors.tooOftenSeconds.replace("{n}", String(seconds))
        : page.errors.tooOften.replace("{n}", String(Math.ceil(seconds / 60)));
    }

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

  /*
    Ведём человека к первому незаполненному полю.

    Красной рамки самой по себе мало: форма выше экрана, и после отправки
    человек остаётся там, где нажал кнопку, — а рамка краснеет где-то вверху,
    вне поля зрения. Раньше эту работу делала сводка над формой, которая
    забирала фокус; сводки больше нет, значит фокус забирает само поле.

    Порядок перечислен руками, а не взят из ключей ошибок: у объекта порядок
    не тот, в каком поля стоят на странице, и человека уводило бы к согласию
    в конце формы, минуя пустой рассказ в начале.
  */
  useEffect(() => {
    if (state.status !== "error") return;

    const order = ["typeSlug", "story", "link", "city", "files", "consent"];
    const first = order.find((field) => state.errors[field]);
    if (!first) return;

    const id = first === "typeSlug" ? "type-first" : first;
    document.getElementById(id)?.focus({ preventScroll: false });
  }, [state]);

  const valueOf = (field: string) =>
    state.status === "error" ? state.values[field] : undefined;

  return (
    <form action={action} className="max-w-2xl" noValidate>
      <FormNotice text={errorFor("form")} />

      <input type="hidden" name="lang" value={lang} />

      {/* Ловушка для роботов: спрятана от людей, но видна автозаполнялкам. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label>
          Не заполняйте это поле
          <input type="text" name="trap" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend className="text-base font-medium">
          {page.typeLabel}
          <Required />
        </legend>
        <Hint text={page.typeHint} />

      {/* На широком экране три вида стоят в ряд: выбор из трёх и должен
          выглядеть как выбор, а не как список из трёх полос во всю ширину.
          Заодно форма короче на сотню пикселей. На узком — столбиком, там
          ряд превратился бы в тесноту. */}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {types.map((type, index) => (
            <label
              key={type.slug}
              className={`flex cursor-pointer items-center gap-3 rounded-xs border bg-surface px-4 py-3 transition-colors hover:bg-paper has-checked:border-ink ${
                errorFor("typeSlug") ? "border-2 border-signal" : "border-border"
              }`}
            >
              <input
                id={index === 0 ? "type-first" : undefined}
                type="radio"
                name="typeSlug"
                value={type.slug}
                defaultChecked={valueOf("typeSlug") === type.slug}
                aria-describedby={errorFor("typeSlug") ? "type-error" : undefined}
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
        <FieldError text={errorFor("typeSlug")} id="type-error" />
      </fieldset>

      <StoryField
        dict={dict}
        defaultValue={valueOf("story")}
        error={errorFor("story")}
      />

      {/* Два необязательных поля рядом, а не одно под другим.

          Так форма короче на целый экран, и ширина поля начинает о чём-то
          говорить: под ссылку места много, под название города — вдвое
          меньше. Поле шириной в семьсот пикселей под слово «Бишкек» выглядит
          как требование написать сочинение.

          На узком экране они возвращаются в столбик — там ширина ничего не
          значит, а два поля в ряд стали бы теснотой. */}
      {/* items-end равняет поля по нижнему краю: у ссылки есть подсказка, у
          города нет, и без этого их рамки разъезжались по вертикали на
          строку — мелочь, от которой форма выглядит собранной кое-как. */}
      {/* Дата стоит сразу под рассказом, а не среди необязательных полей
          внизу: когда это случилось — такая же часть случая, как и что
          случилось. Раньше её не было вовсе, и сообщить о чём-то прошлом
          было нечем: временем случая становилось время подачи. */}
      <div className="mt-8">
        <label htmlFor="happenedAt" className="text-base font-medium">
          {page.dateLabel}
        </label>
        <Hint text={page.dateHint} />
        <input
          id="happenedAt"
          name="happenedAt"
          type="date"
          // Границы стоят и в браузере, и на сервере. Браузер подскажет
          // сразу, но верить ему нельзя: форму отправляют и мимо него.
          max={today()}
          min={LIMITS.EARLIEST}
          defaultValue={valueOf("happenedAt") || today()}
          aria-describedby={errorFor("happenedAt") ? "date-error" : undefined}
          aria-invalid={errorFor("happenedAt") ? true : undefined}
          className={`${fieldStyle(Boolean(errorFor("happenedAt")))} sm:max-w-56`}
        />
        <FieldError text={errorFor("happenedAt")} id="date-error" />
      </div>

      <div className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-[1.6fr_1fr] sm:items-end">
        <div>
          <label htmlFor="link" className="text-base font-medium">
            {page.linkLabel}
          </label>
          <Hint text={page.linkHint} />
          <input
            id="link"
            aria-describedby={errorFor("link") ? "link-error" : undefined}
            name="link"
            type="url"
            inputMode="url"
            placeholder={page.linkPlaceholder}
            defaultValue={valueOf("link")}
            aria-invalid={errorFor("link") ? true : undefined}
            className={fieldStyle(Boolean(errorFor("link")))}
          />
          <FieldError text={errorFor("link")} id="link-error" />
        </div>

        <div>
          <label htmlFor="city" className="text-base font-medium">
            {page.cityLabel}
          </label>
          <Hint text={page.cityHint} />
          <input
            id="city"
            aria-describedby={errorFor("city") ? "city-error" : undefined}
            name="city"
            type="text"
            maxLength={LIMITS.CITY_MAX}
            defaultValue={valueOf("city")}
            aria-invalid={errorFor("city") ? true : undefined}
            className={fieldStyle(Boolean(errorFor("city")))}
          />
          <FieldError text={errorFor("city")} id="city-error" />
        </div>
      </div>

      <div className="mt-8">
        <FilePicker dict={dict} lang={lang} />
        <FieldError text={errorFor("files")} id="files-error" />
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xs ${
            errorFor("consent") ? "border-2 border-signal px-3 py-2" : ""
          }`}
        >
          <input
            id="consent"
            type="checkbox"
            name="consent"
            aria-describedby={errorFor("consent") ? "consent-error" : undefined}
            aria-required="true"
            aria-invalid={errorFor("consent") ? true : undefined}
            className="mt-1 h-4 w-4 shrink-0 accent-ink"
          />
          <span>
            <span className="text-base">
              {page.consentLabel}
              <Required />
            </span>
            {page.consentHint ? (
              <span className="mt-1 block text-sm text-muted">
                {page.consentHint}
              </span>
            ) : null}
          </span>
        </label>
        <FieldError text={errorFor("consent")} id="consent-error" />
      </div>

      <div className="mt-8">
        <Submit dict={dict} />
      </div>
    </form>
  );
}
