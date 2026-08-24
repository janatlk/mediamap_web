"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";
import {
  TRANSLATION_CODES,
  TRANSLATION_LANGUAGES,
} from "@/lib/translation-languages";

/*
  Выбор языка перевода.

  Стоял слева, под заголовком, с подписью «Читать на другом языке» и кнопкой
  «Показать» — и читался как ещё один отбор ленты, вроде «показать все».
  Теперь это то, чем оно и является: настройка справа от ленты, названная
  своим именем.

  Переключение сразу, без кнопки: кнопка рядом с единственным списком — лишний
  шаг, про который забывают. Это обычный переход по адресу, поэтому «назад» в
  браузере работает как обычно, а страницу с выбранным языком можно переслать.

  Кнопка всё же есть — в noscript. Без JS список сам ничего не отправит.

  Выбранное значение приходит из адреса и задано жёстко, а не «по умолчанию».
  Иначе после кнопки «назад» список оставался при своём: адрес уже без
  перевода, а в окошке по-прежнему «Кыргызча» — элемент управления врал о
  том, что показывает страница.
*/

type Props = {
  dict: Dictionary;
  lang: string;
  /** Язык из адреса. Пусто — перевод не выбран. */
  selected?: string;
  /** Показывать ли материалы на всех языках — этот отбор надо сохранить. */
  showAll: boolean;
};

export default function TranslationPicker({
  dict,
  lang,
  selected,
  showAll,
}: Props) {
  const words = dict.newsPage;
  const router = useRouter();
  const [pending, start] = useTransition();

  const go = (value: string) => {
    const next = new URLSearchParams();
    if (showAll) next.set("all", "1");
    if (value) next.set("to", value);
    // Номер страницы не переносим: язык перевода к нему отношения не имеет, а
    // остаться на седьмой странице после смены языка — неожиданность.

    const query = next.toString();
    start(() => router.push(query ? `/${lang}/news?${query}` : `/${lang}/news`));
  };

  return (
    <form
      method="get"
      className="flex flex-col gap-1.5"
      onSubmit={(event) => event.preventDefault()}
    >
      <label
        htmlFor="translate-to"
        className="text-xs tracking-wide text-muted uppercase"
      >
        {words.translateTo}
      </label>

      {/* Стрелку рисуем сами: у системного select она разная в каждом
          браузере и с рамками страницы не спорит только по случайности. */}
      <span className="relative inline-flex">
        <select
          id="translate-to"
          name="to"
          value={selected ?? ""}
          disabled={pending}
          onChange={(event) => go(event.target.value)}
          className="h-11 w-full appearance-none rounded-xs border border-border bg-surface py-0 pr-10 pl-3 text-base transition-colors hover:border-ink focus:border-ink focus:outline-none disabled:opacity-60 sm:w-52"
        >
          <option value="">{words.translateNone}</option>
          {TRANSLATION_CODES.map((code) => (
            <option key={code} value={code}>
              {TRANSLATION_LANGUAGES[code]}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </span>

      <noscript>
        <button
          type="submit"
          className="mt-1 inline-flex h-11 items-center rounded-xs border border-border px-4 text-sm"
        >
          {words.translateApply}
        </button>
      </noscript>
    </form>
  );
}
