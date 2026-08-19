import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CaseFilter from "@/components/cases/CaseFilter";
import CaseList from "@/components/cases/CaseList";
import Pagination from "@/components/ui/Pagination";
import { FORMS, isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { withCount } from "@/lib/plural";
import { loadCasePage } from "@/server/case-data";
import { loadViolationTypes } from "@/server/violations";

// Список случаев. Фильтр и номер страницы живут в адресе — страницу можно
// переслать, и она откроется в том же виде.

export const revalidate = 300;

type Params = { lang: string };
type Query = { type?: string; page?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.cases.title, description: dict.cases.lead };
}

/** Адрес списка с выбранным видом и номером страницы. */
const buildHref = (lang: string, type: string | undefined, page: number) => {
  const search = new URLSearchParams();
  if (type) search.set("type", type);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/${lang}/cases?${query}` : `/${lang}/cases`;
};

export default async function CasesPage({
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

  const types = await loadViolationTypes();
  // Вид приходит из адреса и может быть любым — берём только известный.
  const active = types.find((type) => type.slug === query.type)?.slug;
  const requestedPage = Number.parseInt(query.page ?? "1", 10) || 1;

  const { items, total, page, pageCount } = await loadCasePage(
    active,
    requestedPage,
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl sm:text-4xl">{dict.cases.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-muted">{dict.cases.lead}</p>

      <div className="mt-8">
        <CaseFilter dict={dict} lang={lang} types={types} active={active} />
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-muted">
          {active ? dict.cases.emptyFiltered : dict.cases.empty}
        </p>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted">
            {withCount(total, FORMS[lang].cases, lang)} {dict.cases.found}
          </p>

          <div className="mt-4">
            <CaseList cases={items} dict={dict} lang={lang} />
          </div>

          <Pagination
            dict={dict}
            page={page}
            pageCount={pageCount}
            hrefFor={(target) => buildHref(lang, active, target)}
          />
        </>
      )}
    </div>
  );
}
