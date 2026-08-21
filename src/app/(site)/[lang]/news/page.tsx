import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import Pagination from "@/components/ui/Pagination";
import { formatDate } from "@/lib/format";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { loadNewsPage } from "@/server/news-data";

// Лента новостей. Отбор по языку и номер страницы живут в адресе.

export const revalidate = 300;

type Params = { lang: string };
type Query = { page?: string; all?: string };

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
const buildHref = (lang: string, showAll: boolean, page: number) => {
  const search = new URLSearchParams();
  if (showAll) search.set("all", "1");
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

      {/* Переключатель показываем, только если есть что скрывать: кнопка,
          которая ничего не меняет, сбивает с толку. */}
      {hiddenByLanguage > 0 ? (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Link href={buildHref(lang, false, 1)} className={tab(!showAll)}>
            {dict.newsPage.onlyReadable}
          </Link>
          <Link href={buildHref(lang, true, 1)} className={tab(showAll)}>
            {dict.newsPage.showAll}
          </Link>

          {!showAll ? (
            <span className="text-sm text-muted">
              {dict.newsPage.hiddenNote.replace("{n}", String(hiddenByLanguage))}
            </span>
          ) : null}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-10 text-muted">{dict.newsPage.empty}</p>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted">
            {dict.newsPage.found.replace("{n}", String(total))}
          </p>

          <ul className="mt-6 space-y-6">
            {items.map((item) => (
              <li key={item.id} className="border-b border-line pb-6">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group block"
                >
                  <span className="text-lg group-hover:text-signal">
                    {item.title}
                    {/* Уводит на чужой сайт — предупреждаем стрелкой. */}
                    <ArrowUpRight
                      className="ml-1 inline h-4 w-4 align-baseline text-muted"
                      aria-hidden="true"
                    />
                    <span className="sr-only">{dict.a11y.externalLink}</span>
                  </span>

                  {/* Две строки и не больше. Подзаголовки приезжают из чужих
                      лент любой длины, и на пяти абзацах подряд лента
                      превращалась в стену, по которой не пробежаться
                      глазами. Двух строк хватает, чтобы решить, открывать.

                      Без block: line-clamp держится на display:-webkit-box,
                      и block его перебивает — обрезка молча перестаёт
                      работать, а класс остаётся на месте. */}
                  {item.snippet ? (
                    <span className="mt-2 line-clamp-2 max-w-prose text-sm text-muted">
                      {item.snippet}
                    </span>
                  ) : null}

                  <span className="mt-2 block font-mono text-2xs text-muted">
                    {item.source} · {formatDate(item.publishedAt, lang)}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <Pagination
            dict={dict}
            page={page}
            pageCount={pageCount}
            hrefFor={(target) => buildHref(lang, showAll, target)}
          />
        </>
      )}
    </div>
  );
}
