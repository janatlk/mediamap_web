import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Dictionary, Lang } from "@/lib/i18n";

/*
  Первый экран: что это за место и что здесь можно сделать.

  Справа была тепловая карта — убрали. Показывать было нечего: у всех
  случаев разные точки, и вместо плотности выходил ровный розовый налёт.
  Взамен ничего не рисовали, и какое-то время половина экрана просто
  пустовала. На снимке это читалось не как сдержанность, а как незагрузившаяся
  картинка, поэтому заголовок и всё остальное разведены в две колонки:
  ширину страницы занимает текст, а не пустота.

  Работу здесь делает набор. Строка над заголовком — что мы делаем,
  заголовок — где, подзаголовок — из чего это складывается. Ширину держим
  по числу знаков, а не по колонке сетки: заголовок должен ломаться на
  три строки на любом экране, иначе он расползается в ленту.

  Размеры берём только из шкалы в globals.css. Крупнее text-5xl там ничего
  нет, и это не упущение: свой размер мимо шкалы Tailwind подставит из
  своей, и заголовок разъедется с остальным сайтом.
*/

type Props = { dict: Dictionary; lang: Lang };

export default function Hero({ dict, lang }: Props) {
  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-14 pb-14 sm:px-6 lg:px-10 lg:pt-24 lg:pb-20">
      <p className="text-sm tracking-[0.14em] text-muted uppercase">
        {dict.home.slogan}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-end lg:gap-16">
        <h1 className="max-w-[16ch] text-3xl tracking-tight text-balance sm:text-4xl lg:text-5xl">
          {dict.home.title}
        </h1>

        <div className="lg:pb-2">
          <p className="max-w-prose text-lg text-muted lg:text-xl">{dict.home.lead}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href={`/${lang}/report`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep"
            >
              {dict.home.actionPrimary}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/${lang}/cases`}
              className="inline-flex h-12 items-center justify-center rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
            >
              {dict.home.actionSecondary}
            </Link>
          </div>

          {/* Анонимность — сразу у кнопки. Для многих это условие, без
              которого они вообще не напишут. */}
          <p className="mt-4 text-sm text-muted">{dict.home.anonymous}</p>
        </div>
      </div>
    </section>
  );
}
