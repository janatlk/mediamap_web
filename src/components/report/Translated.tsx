import { Suspense } from "react";

import type { Lang } from "@/lib/i18n/languages";
import { translateTexts } from "@/server/text-translation";

/*
  Текст на языке страницы, с подгрузкой.

  Перевод свежего текста — секунды: модель считает на процессоре. Держать
  из-за этого всю страницу нельзя — человек сменил язык и смотрит на
  белый экран. Поэтому страница приходит сразу, а на месте текста стоит
  короткая «рябь» в его размер, пока перевод не догрузится. Готовый перевод
  берётся из памяти за миллисекунды, и рябь тогда не видна вовсе.

  Разметка — span, а не div: текст стоит внутри <p> и <h1>.
*/

type Props = {
  text: string | null | undefined;
  lang: Lang;
  /** Сколько строк ряби показать — примерно по длине ожидаемого текста. */
  lines?: number;
};

export default function Translated({ text, lang, lines = 2 }: Props) {
  if (!text?.trim()) return null;

  return (
    <Suspense fallback={<Shimmer lines={lines} />}>
      <Resolved text={text} lang={lang} />
    </Suspense>
  );
}

async function Resolved({ text, lang }: { text: string; lang: Lang }) {
  const [translated] = await translateTexts([text], lang);
  return <>{translated ?? text}</>;
}

const WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-3/5"];

function Shimmer({ lines }: { lines: number }) {
  return (
    <span role="status" aria-busy="true" className="block space-y-2 py-1">
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          className={`block h-[0.8em] animate-pulse rounded-xs bg-line ${
            index === lines - 1 && lines > 1 ? "w-3/5" : WIDTHS[index % WIDTHS.length]
          }`}
        />
      ))}
      <span className="sr-only">…</span>
    </span>
  );
}
