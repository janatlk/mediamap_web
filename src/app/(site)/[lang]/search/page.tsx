import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import SearchBox from "@/components/search/SearchBox";
import { isReadyLanguage, type Dictionary } from "@/lib/i18n";
import { plural } from "@/lib/plural";
import { getContent } from "@/server/content";
import { MIN_QUERY, search, type SearchGroupId, type SearchHit } from "@/server/search-data";

/*
  Результаты поиска. Запрос живёт в адресе: страницу можно переслать.

  Разбито по разделам сайта, а не свалено в один список по «релевантности».
  Считать её нам нечем и незачем: разделов пять, и человек, набравший
  «дезинформация», сам решит, что ему нужно — разбор вида, случай из базы
  или статья в дайджесте.
*/

// Ищем по живой базе: свежий случай должен находиться сразу.
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
  // Страницу результатов в поиск отдавать незачем: она у каждого своя.
  return { title: dict.searchPage.title, robots: { index: false, follow: true } };
}

const groupTitle = (dict: Dictionary, id: SearchGroupId) =>
  ({
    cases: dict.searchPage.groupCases,
    news: dict.searchPage.groupNews,
    types: dict.searchPage.groupTypes,
    glossary: dict.searchPage.groupGlossary,
    pages: dict.searchPage.groupPages,
  })[id];

function Hit({ hit, external }: { hit: SearchHit; external: string }) {
  const body = (
    <>
      <span className="text-base group-hover:text-signal">
        {hit.title}
        {hit.external ? (
          <>
            <ArrowUpRight
              className="ml-1 inline h-3.5 w-3.5 align-baseline text-muted"
              aria-hidden="true"
            />
            <span className="sr-only">{external}</span>
          </>
        ) : null}
      </span>
      {hit.note ? (
        <span className="mt-1 block max-w-prose text-sm text-muted">{hit.note}</span>
      ) : null}
    </>
  );

  return (
    <li className="border-b border-line">
      {hit.external ? (
        <a
          href={hit.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group block py-4"
        >
          {body}
        </a>
      ) : (
        <Link href={hit.href} className="group block py-4">
          {body}
        </Link>
      )}
    </li>
  );
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

  const dict = await getContent(lang);
  const page = dict.searchPage;
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const result = query ? await search(query, lang, dict) : null;
  const tooShort = query.length > 0 && query.length < MIN_QUERY;

  const matchForms = [page.matchOne, page.matchFew, page.matchMany] as const;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">{page.title}</h1>
        <p className="mt-4 text-lg text-muted">{page.lead}</p>

        <div className="mt-8">
          <SearchBox dict={dict} lang={lang} query={query} autoFocus={!query} />
        </div>

        {tooShort ? <p className="mt-6 text-muted">{page.tooShort}</p> : null}

        {result && !tooShort ? (
          result.total === 0 ? (
            <div className="mt-10">
              <p className="text-muted">{page.nothing}</p>
              <p className="mt-2 text-sm text-muted">{page.nothingHint}</p>
            </div>
          ) : (
            <>
              <p className="mt-8 text-sm text-muted">
                {page.found} {result.total}{" "}
                {plural(result.total, matchForms, lang)}
              </p>

              {result.groups.map((group) => (
                <section key={group.id} className="mt-10">
                  <h2 className="text-2xl">{groupTitle(dict, group.id)}</h2>

                  <ul className="mt-4 border-t border-line">
                    {group.hits.map((hit) => (
                      <Hit key={hit.href} hit={hit} external={dict.a11y.externalLink} />
                    ))}
                  </ul>

                  {/* Показали не всё — говорим об этом. Молча обрезанный
                      список выглядит как полный, и человек уходит уверенный,
                      что больше ничего нет. */}
                  {group.total > group.hits.length ? (
                    <p className="mt-3 text-sm text-muted">
                      {page.truncated
                        .replace("{shown}", String(group.hits.length))
                        .replace("{total}", String(group.total))}
                    </p>
                  ) : null}
                </section>
              ))}
            </>
          )
        ) : null}
      </div>
    </div>
  );
}
