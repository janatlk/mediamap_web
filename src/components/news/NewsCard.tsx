"use client";

import { useState } from "react";
import { ArrowUpRight, Languages } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";
import type { Translated } from "@/server/translate";

/*
  Заметка в ленте — вместе с переводом.

  Разметку рисует клиентский компонент целиком, а не серверная страница:
  перевод меняет заголовок и подзаголовок прямо на месте, и разделить
  «текст оттуда, кнопка отсюда» нельзя — функцию-шаблон через границу
  сервер/клиент не передать.

  Перевод по кнопке у каждой заметки, а не разом на всю ленту: модель считает
  на процессоре секунду-две на заметку, и перевод всей страницы означал бы
  полминуты ожидания ради одного заголовка, который человеку и нужен.

  Оригинал никуда не девается — под переводом остаётся кнопка вернуть его.
  Машинный перевод врёт достаточно часто, чтобы возможность свериться была
  не роскошью.
*/

type Item = {
  id: number;
  title: string;
  snippet: string | null;
  link: string;
  source: string;
  /** Дата уже в нужном виде: форматирование осталось на сервере. */
  date: string;
};

type Props = {
  dict: Dictionary;
  item: Item;
  /** Язык перевода. Пусто — переводить не предлагаем. */
  to?: string;
};

export default function NewsCard({ dict, item, to }: Props) {
  const words = dict.newsPage;
  const [translated, setTranslated] = useState<Translated | null>(null);
  const [failed, setFailed] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [pending, setPending] = useState(false);

  const shown = translated && !showOriginal ? translated : item;

  /*
    Обычный fetch, а не серверное действие и не useTransition.

    Серверные действия в Next идут одной очередью вместе с переходами по
    сайту: пока перевод считается, нажатие на любую ссылку молча ждёт, и
    страница выглядит зависшей. У NLLB это секунды, а первый перевод после
    запуска — до двадцати секунд, пока грузится модель.

    Обычный запрос в эту очередь не встаёт: пока переводится одна заметка,
    сайтом можно пользоваться.
  */
  const run = async () => {
    if (!to || pending) return;

    // Уже переводили — сервис не тревожим, просто переключаем показ.
    if (translated) {
      setShowOriginal((value) => !value);
      return;
    }

    setFailed(false);
    setPending(true);
    try {
      const response = await fetch("/api/news/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, lang: to }),
      });
      const result = (await response.json()) as
        | { status: "ok"; text: Translated }
        | { status: "error" };

      if (response.ok && result.status === "ok") setTranslated(result.text);
      else setFailed(true);
    } catch {
      // Сеть отвалилась или ответ не разобрался — человеку одинаково важно
      // только то, что перевода не будет.
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  const label = pending
    ? words.translating
    : translated
      ? showOriginal
        ? words.showTranslation
        : words.showOriginal
      : words.translate;

  return (
    <li className="border-b border-line pb-6">
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="group block"
      >
        <span className="text-lg group-hover:text-signal">
          {shown.title}
          {/* Уводит на чужой сайт — предупреждаем стрелкой. */}
          <ArrowUpRight
            className="ml-1 inline h-4 w-4 align-baseline text-muted"
            aria-hidden="true"
          />
          <span className="sr-only">{dict.a11y.externalLink}</span>
        </span>

        {/* Две строки и не больше. Подзаголовки приезжают из чужих лент любой
            длины, и на пяти абзацах подряд лента превращалась в стену, по
            которой не пробежаться глазами.

            Без block: line-clamp держится на display:-webkit-box, и block его
            перебивает — обрезка молча перестаёт работать. */}
        {shown.snippet ? (
          <span className="mt-2 line-clamp-2 max-w-prose text-sm text-muted">
            {shown.snippet}
          </span>
        ) : null}

        <span className="mt-2 block text-xs text-muted">
          {item.source} · {item.date}
        </span>
      </a>

      {/* Кнопка снаружи ссылки, а не внутри: кнопка внутри ссылки — это два
          действия на одном месте, и нажатие достаётся тому, кто успел. */}
      {to ? (
        <p className="mt-1 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-signal hover:underline disabled:opacity-60"
          >
            <Languages className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>

          {/* Про машинный перевод человеку стоит знать ровно тогда, когда он
              его читает, — а не в сноске внизу страницы. */}
          {translated && !showOriginal ? (
            <span className="text-xs text-muted">{words.machineNote}</span>
          ) : null}

          {failed ? (
            <span className="text-sm text-signal">{words.translateFailed}</span>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}
