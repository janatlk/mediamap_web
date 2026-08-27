import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Bars, { type BarRow } from "@/components/analytics/Bars";
import Trend from "@/components/analytics/Trend";
import { formatMonthYearShort } from "@/lib/format";
import { FORMS, isReadyLanguage, violationText, type Lang } from "@/lib/i18n";
import { withCount } from "@/lib/plural";
import { KG_REGIONS } from "@/lib/regions";
import { typeColor } from "@/lib/violation-types";
import { getContent } from "@/server/content";
import { getPublicAnalytics } from "@/server/public-analytics";

/*
  Аналитика. Считает src/server/public-analytics.ts, здесь только показ.

  Три раздела отвечают на три вопроса подряд: чего больше, стало ли этого
  больше со временем и где это встречается. Каждый — список с полосками или
  ряд столбиков; ни одной картинки, которую нельзя прочесть числами рядом.
*/

export const revalidate = 300;

type Params = { lang: string };

const regionName = (code: string, lang: Lang) =>
  KG_REGIONS.find((region) => region.code === code)?.name[lang] ?? code;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.analyticsPage.title, description: dict.analyticsPage.lead };
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const page = dict.analyticsPage;
  const data = await getPublicAnalytics();

  const stats = [
    { value: String(data.total), label: page.statTotal },
    { value: String(data.sourceCount), label: page.statSources },
    { value: String(data.regions.length), label: page.statRegions },
    {
      value: data.since ? formatMonthYearShort(data.since, lang) : "—",
      label: page.statSince,
    },
  ];

  const typeRows: BarRow[] = data.types.map((type) => ({
    key: type.slug,
    label: violationText(dict, type.slug)?.name ?? type.slug,
    count: type.count,
    color: typeColor(type.slug),
  }));

  const sourceRows: BarRow[] = data.sources.map((item) => ({
    key: item.key,
    label: item.key,
    count: item.count,
  }));

  const regionRows: BarRow[] = data.regions.map((item) => ({
    key: item.key,
    label: regionName(item.key, lang),
    count: item.count,
  }));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl sm:text-4xl">{page.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-muted">{page.lead}</p>

      {/* Оговорка вверху, до первой цифры: ниже её уже не прочтут. */}
      <p className="mt-6 max-w-prose border-l-2 border-line pl-4 text-sm text-muted">
        {page.caveat}
      </p>

      {data.total === 0 ? (
        <p className="mt-12 border-t border-line pt-8 text-muted">{page.empty}</p>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-paper py-6 pr-4 sm:pr-6">
                <p className="font-display text-3xl tabular-nums">{stat.value}</p>
                <p className="mt-1 text-sm text-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          <section className="mt-14 border-t border-line pt-8">
            <h2 className="text-2xl">{page.typesTitle}</h2>
            <p className="mt-2 max-w-prose text-muted">{page.typesLead}</p>
            <Bars
              rows={typeRows}
              total={data.total}
              lang={lang}
              empty={page.empty}
            />
          </section>

          <section className="mt-14 border-t border-line pt-8">
            <h2 className="text-2xl">{page.trendTitle}</h2>
            <p className="mt-2 max-w-prose text-muted">{page.trendLead}</p>
            <Trend
              dict={dict}
              lang={lang}
              types={data.types}
              trend={data.trend}
              peak={data.trendPeak}
            />
          </section>

          <div className="mt-14 grid gap-14 border-t border-line pt-8 lg:grid-cols-2 lg:gap-x-16">
            <section>
              <h2 className="text-2xl">{page.sourcesTitle}</h2>
              <p className="mt-2 max-w-prose text-muted">{page.sourcesLead}</p>
              <Bars
                rows={sourceRows}
                total={data.total}
                lang={lang}
                empty={page.sourcesEmpty}
              />
            </section>

            <section>
              <h2 className="text-2xl">{page.regionsTitle}</h2>
              <p className="mt-2 max-w-prose text-muted">{page.regionsLead}</p>
              <Bars
                rows={regionRows}
                total={data.total}
                lang={lang}
                empty={page.regionsEmpty}
              />

              {/* Сколько случаев осталось без области — иначе доли в списке
                  выше не сходятся, и это выглядит как ошибка. */}
              {data.withoutRegion > 0 ? (
                <p className="mt-6 text-sm text-muted">
                  {withCount(data.withoutRegion, FORMS[lang].cases, lang)} —{" "}
                  {page.regionsUnknown}
                </p>
              ) : null}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
