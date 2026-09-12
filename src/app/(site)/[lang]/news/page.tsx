import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import NewsCard from "@/components/news/NewsCard";
import TranslationPicker from "@/components/news/TranslationPicker";
import Pagination from "@/components/ui/Pagination";
import { formatDate } from "@/lib/format";
import { isReadyLanguage } from "@/lib/i18n";
import { isTranslationLang } from "@/lib/translation-languages";
import { getContent } from "@/server/content";
import { guessLanguage } from "@/server/translate";
import { loadNewsPage } from "@/server/news-data";

// Лента новостей. Отбор по языку и номер страницы живут в адресе.

export const revalidate = 300;

type Params = { lang: string };
type Query = { page?: string; all?: string; to?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.newsPage.title, description: dict.newsPage.lead };
}

/** Адрес ленты с выбранным отбором и номером страницы. */
const buildHref = (lang: string, showAll: boolean, page: number, to?: string) => {
  const search = new URLSearchParams();
  if (showAll) search.set("all", "1");
  if (to) search.set("to", to);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/${lang}/news?${query}` : `/${lang}/news`;
};

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Query>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const query = await searchParams;

  const showAll = query.all === "1";

  /*
    Язык перевода живёт в адресе, а не в памяти браузера: страницу с
    переводом можно переслать, и она откроется такой же. Незнакомый код
    отбрасываем — он приходит из адресной строки, где бывает что угодно.
  */
  const to =
    query.to && isTranslationLang(query.to) ? query.to : undefined;
  const requestedPage = Number.parseInt(query.page ?? "1", 10) || 1;
  const { items, total, page, pageCount, hiddenByLanguage } =
    await loadNewsPage(requestedPage, showAll);

  const tab = (isActive: boolean) =>
    `inline-flex h-10 items-center rounded-xs border px-4 text-sm transition-colors ${
      isActive ? "border-ink bg-ink text-surface" : "border-border hover:bg-surface"
    }`;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl sm:text-4xl">{dict.newsPage.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-muted">
        {dict.newsPage.lead}
      </p>

      {/* Отбор ленты слева, язык перевода справа: это разные вещи, и
          стоять они должны по разные стороны, а не одна под другой. */}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        {/* Переключатель показываем, только если есть что скрывать: кнопка,
            которая ничего не меняет, сбивает с толку. */}
        {hiddenByLanguage > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={buildHref(lang, false, 1, to)} className={tab(!showAll)}>
              {dict.newsPage.onlyReadable}
            </Link>
            <Link href={buildHref(lang, true, 1, to)} className={tab(showAll)}>
              {dict.newsPage.showAll}
            </Link>

            {!showAll ? (
              <span className="text-sm text-muted">
                {dict.newsPage.hiddenNote.replace("{n}", String(hiddenByLanguage))}
              </span>
            ) : null}
          </div>
        ) : (
          // Пустой блок держит выбор языка прижатым вправо, когда отбора нет.
          <span />
        )}

        <TranslationPicker dict={dict} lang={lang} selected={to} showAll={showAll} />
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-muted">{dict.newsPage.empty}</p>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted">
            {dict.newsPage.found.replace("{n}", String(total))}
          </p>

          <ul className="mt-6 space-y-6">
            {items.map((item) => (
              <NewsCard
                key={item.id}
                dict={dict}
                item={{
                  id: item.id,
                  title: item.title,
                  snippet: item.snippet,
                  link: item.link,
                  source: item.source,
                  date: formatDate(item.publishedAt, lang),
                }}
                /* Предлагаем перевод, только если есть во что переводить:
                   язык выбран и он не тот, на котором заметка написана. */
                to={
                  to !== undefined &&
                  guessLanguage(`${item.title} ${item.snippet ?? ""}`) !== to
                    ? to
                    : undefined
                }
              />
            ))}
          </ul>

          <Pagination
            dict={dict}
            page={page}
            pageCount={pageCount}
            hrefFor={(target) => buildHref(lang, showAll, target, to)}
          />
        </>
      )}
    </div>
  );
}
