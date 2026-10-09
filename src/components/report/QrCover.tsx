"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";

/*
  Заслонка над снимком, на котором нашёлся QR-код.

  Зачем. Код — это ссылка, которой не видно глазами, и телефон на неё
  наводят не задумываясь. Снимки в случаях приходят из сообщений о
  мошенничестве, то есть ровно оттуда, где код ведёт не туда, куда обещано.
  Показать такой снимок посетителю открытым — значит раздать мошенническую
  ссылку дальше нашими руками.

  Почему «Отмена» заметнее, чем «Я знаю, что делаю». Решение проекта, и оно
  согласуется с тем, как вообще устроены предупреждения: выделенной должна
  быть безопасная сторона, потому что по заметной кнопке нажимают не читая.
  Кто действительно хочет посмотреть — прочтёт и найдёт вторую.

  Куда ведёт код, здесь не пишем. Расшифровка собрана для проверяющего и
  лежит в панели; печатать адрес мошеннического сайта на открытой странице
  значит разносить его дальше.

  Размытие — только внешний вид. Сам файл отдаётся по той же ссылке, и
  это нормально: заслонка защищает от нечаянного сканирования, а не от
  того, кто целенаправленно лезет в исходники страницы.
*/

type Props = {
  dict: Dictionary;
  /** Снимок — его рисует вызывающий, чтобы разметка картинки была в одном месте. */
  children: React.ReactNode;
};

export default function QrCover({ dict, children }: Props) {
  const words = dict.qrCover;
  // closed — предупреждение на снимке, asked — свёрнуто после «Отмены»,
  // open — человек посмотрел и согласился.
  const [state, setState] = useState<"closed" | "asked" | "open">("closed");

  if (state === "open") return <>{children}</>;

  return (
    <div className="relative">
      {/* Сам снимок остаётся в потоке: он задаёт карточке высоту, иначе
          заслонка схлопнулась бы в полоску. Размываем сильно и гасим —
          через такое размытие код не прочитает ни глаз, ни камера. */}
      <div aria-hidden="true" className="pointer-events-none blur-2xl brightness-90 select-none">
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-surface/80 p-4">
        {state === "asked" ? (
          <button
            type="button"
            onClick={() => setState("closed")}
            className="inline-flex min-h-11 items-center gap-2 border border-border bg-surface px-4 text-sm hover:border-ink"
          >
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            {words.show}
          </button>
        ) : (
          <div className="max-w-xs text-center">
            <ShieldAlert
              className="mx-auto h-6 w-6 text-signal"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm">{words.title}</p>
            <p className="mt-1 text-sm text-muted">{words.text}</p>

            <div className="mt-4 flex flex-col items-center gap-2">
              {/* Безопасная сторона — крупной кнопкой во всю ширину. */}
              <button
                type="button"
                onClick={() => setState("asked")}
                className="inline-flex min-h-11 w-full items-center justify-center bg-ink px-5 text-base text-surface hover:opacity-90"
              >
                {words.cancel}
              </button>

              <button
                type="button"
                onClick={() => setState("open")}
                className="min-h-11 text-sm text-muted underline underline-offset-4 hover:text-ink"
              >
                {words.confirm}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
