import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { violationText, type Dictionary, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { typeColor } from "@/lib/violation-types";
import type { CaseRow } from "@/server/home-data";

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

type Props = { dict: Dictionary; lang: Lang; latest: CaseRow[] };

export default function Hero({ dict, lang, latest }: Props) {
  return (
    /*
      На телефоне отступы чуть меньше, чем на десктопе. На 375×812 первый
      экран кончался на 755px, и в последние полсотни пикселей влезали
      только верхушки чисел статистики без подписей — «7 7», обрывок
      непонятно чего. Минус ~80px, и полоса с числами входит целиком.
    */
    <section className="mx-auto max-w-[1400px] px-4 pt-8 pb-6 sm:px-6 sm:pt-14 sm:pb-14 lg:px-10 lg:pt-20 lg:pb-20">
      {/*
        Две колонки: слева — кто мы и что сделать, справа — свежие проверки.

        Раньше справа стоял только абзац с кнопками, прижатый к низу, а над
        ним пустовала половина экрана. Первый экран был одним текстом, и
        сайт о проверенных случаях не показывал ни одного случая — читался
        как титульный лист. Теперь справа то, ради чего сюда приходят, и это
        данные, а не картинка для заполнения места.
      */}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-20">
        <div>
          <p className="text-sm tracking-[0.14em] text-muted uppercase">
            {dict.home.slogan}
          </p>

          <h1 className="mt-4 max-w-[16ch] text-3xl tracking-tight text-balance sm:mt-6 sm:text-4xl lg:text-5xl">
            {dict.home.title}
          </h1>

          <p className="mt-6 max-w-prose text-lg text-muted lg:text-xl">{dict.home.lead}</p>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
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

        {/* На телефоне карточки нет: там первый экран и так занят, а тот
            же список стоит ниже, в «Проверенных случаях». */}
        {latest.length > 0 ? (
          <aside className="hidden border border-line bg-surface lg:block">
            <div className="flex items-baseline justify-between gap-4 border-b border-line px-6 py-4">
              <h2 className="eyebrow">{dict.home.latestTitle}</h2>
              <Link
                href={`/${lang}/cases`}
                className="inline-flex items-center gap-1 text-sm text-signal hover:underline"
              >
                {dict.home.casesAll}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <ul>
              {latest.map((item) => {
                const typeName =
                  violationText(dict, item.typeSlug)?.name ?? item.typeSlug;
                return (
                  <li key={item.id} className="border-b border-line last:border-b-0">
                    <Link
                      href={`/${lang}/cases/${item.publicId}`}
                      className="block px-6 py-5 transition-colors hover:bg-paper"
                    >
                      <span className="flex items-center gap-2 text-sm text-muted">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${typeColor(item.typeSlug)}`}
                          aria-hidden="true"
                        />
                        {/* Без заголовка вид уже стоит строкой ниже вместо него. */}
                        {item.headline ? (
                          <>
                            {typeName}
                            <span aria-hidden="true">·</span>
                          </>
                        ) : null}
                        <span className="tabular-nums">{formatDate(item.checkedAt, lang)}</span>
                      </span>
                      <span className="mt-2 line-clamp-2 block text-lg">
                        {item.headline ?? typeName}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
