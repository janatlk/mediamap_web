import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";

import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { MIN_QUERY, emptyResult, search } from "@/server/search-data";

/*
  Поиск по сайту.

  Обычная форма с методом GET, без единой строчки клиентского кода: запрос
  живёт в адресе, и найденное можно переслать ссылкой, а кнопка «назад»
  работает сама собой. Живой поиск по мере набора здесь был бы хуже — он
  бьёт в базу на каждую букву и всё равно требует Enter, чтобы результат
  остановился.
*/

// Ищем по свежим данным: страница зависит от запроса, кэшировать нечего.
export const dynamic = "force-dynamic";

type Params = { lang: string };
type Query = { q?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return {
    title: dict.searchPage.title,
    description: dict.searchPage.lead,
    // Страницы результатов в поисковой выдаче не нужны.
    robots: { index: false },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Query>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const { q = "" } = await searchParams;
  const dict = await getContent(lang);
  const words = dict.searchPage;

  const query = q.trim();
  const asked = query.length > 0;
  const result = asked ? await search(query, lang) : emptyResult();

  const heading = {
    cases: words.groupCases,
    news: words.groupNews,
    types: words.groupTypes,
    glossary: words.groupGlossary,
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">{words.title}</h1>
        <p className="mt-4 text-lg text-muted">{words.lead}</p>

        <form action={`/${lang}/search`} className="mt-8 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={words.placeholder}
            aria-label={words.placeholder}
            /* Курсор в поле при открытии пустой страницы: человек пришёл
               искать, а не смотреть на неё. */
            autoFocus={!asked}
            className="h-12 min-w-0 flex-1 rounded-xs border border-border bg-surface px-4 text-base"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-5 text-base font-medium text-surface transition-colors hover:bg-signal-deep"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {words.action}
          </button>
        </form>

        {asked && query.length < MIN_QUERY ? (
          <p className="mt-8 text-muted">{words.hint}</p>
        ) : null}

        {asked && query.length >= MIN_QUERY && result.total === 0 ? (
          <div className="mt-8">
            <p className="text-muted">{words.nothing.replace("{q}", query)}</p>
            <p className="mt-2 text-muted">{words.nothingHint}</p>
          </div>
        ) : null}

        {result.total > 0 ? (
          <>
            <p className="mt-8 text-sm text-muted">
              {words.found.replace("{n}", String(result.total))}
            </p>

            {result.groups.map((group) => (
              <section key={group.id} className="mt-8 border-t border-line pt-6">
                <h2 className="eyebrow">{heading[group.id]}</h2>

                <ul className="mt-4">
                  {group.hits.map((item) => (
                    <li
                      key={`${group.id}:${item.href}:${item.title}`}
                      className="border-b border-line py-4"
                    >
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="group block"
                        >
                          <span className="group-hover:text-signal">
                            {item.title}
                            <ArrowUpRight
                              className="ml-1 inline h-4 w-4 align-baseline text-muted"
                              aria-hidden="true"
                            />
                            <span className="sr-only">
                              {dict.a11y.externalLink}
                            </span>
                          </span>
                        </a>
                      ) : (
                        <Link href={item.href} className="block hover:text-signal">
                          {item.title}
                        </Link>
                      )}

                      {item.note ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted">
                          {item.note}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
