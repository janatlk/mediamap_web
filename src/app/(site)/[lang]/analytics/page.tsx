import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Bars from "@/components/analytics/Bars";
import { isReadyLanguage, violationText, type Lang } from "@/lib/i18n";
import { KG_REGIONS } from "@/lib/regions";
import { typeColor } from "@/lib/violation-types";
import { getContent } from "@/server/content";
import { getPublicAnalytics } from "@/server/public-analytics";

/*
  Аналитика: что видно по всем сообщениям сразу.

  Раздел открытый и считает в том числе непроверенные заявки — так решено
  проектом. Решение спорное, поэтому оговорка про это стоит первым же
  абзацем, а у каждого вида рядом с общим числом показано подтверждённое.
  Числу без такой пары здесь верить нельзя, и человек должен это видеть, не
  открывая пояснений.
*/

export const revalidate = 300;

type Params = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return {
    title: dict.analyticsPage.title,
    description: dict.analyticsPage.lead,
  };
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const words = dict.analyticsPage;
  const data = await getPublicAnalytics();

  const monthShort = new Intl.DateTimeFormat(lang, {
    month: "short",
    timeZone: "UTC",
  });
  const monthLong = new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const regionName = (code: string | null) => {
    if (!code) return words.regionUnknown;
    const region = KG_REGIONS.find((item) => item.code === code);
    return region ? region.name[lang as Lang] : code;
  };

  const typeName = (slug: string) => violationText(dict, slug)?.name ?? slug;

  if (data.total === 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
        <h1 className="text-3xl sm:text-4xl">{words.title}</h1>
        <p className="mt-8 text-muted">{words.empty}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl sm:text-4xl">{words.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-muted">{words.lead}</p>

      {/* Оговорка о том, что попало в счёт. Стоит до чисел, а не после:
          после её уже не читают. */}
      <p className="mt-6 max-w-prose border-l-2 border-line pl-4 text-sm text-muted">
        {words.scopeNote}
      </p>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="eyebrow">{words.totalTitle}</h2>
        <p className="mt-3 font-display text-4xl">{data.total}</p>
        <p className="mt-1 text-sm text-muted">
          {data.confirmed} {words.scopeConfirmed}
        </p>
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="text-2xl">{words.typesTitle}</h2>
        <p className="mt-2 max-w-prose text-muted">{words.typesLead}</p>

        <ul className="mt-6 grid gap-6 sm:grid-cols-3">
          {data.types.map((type) => (
            <li key={type.slug}>
              <span
                className={`block h-1 w-10 ${typeColor(type.slug)}`}
                aria-hidden="true"
              />
              <h3 className="mt-3 text-lg">{typeName(type.slug)}</h3>
              <p className="mt-2 font-display text-3xl">
                {type.total}
                <span className="ml-2 align-middle text-base text-muted">
                  {type.share}%
                </span>
              </p>
              <p className="mt-1 text-sm text-muted">
                {type.confirmed} {words.confirmed} · {type.total - type.confirmed}{" "}
                {words.pending}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="text-2xl">{words.trendTitle}</h2>
        <p className="mt-2 max-w-prose text-muted">{words.trendLead}</p>

        <div className="mt-6 grid gap-10 lg:grid-cols-3">
          {data.trends.map((trend) => (
            <div key={trend.slug}>
              <h3 className="text-lg">{typeName(trend.slug)}</h3>
              <Bars
                slug={trend.slug}
                points={trend.points}
                max={data.trendMax}
                label={(month) => monthShort.format(month)}
                describe={(month, total) =>
                  `${monthLong.format(month)} — ${total}`
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="text-2xl">{words.sourcesTitle}</h2>
        <p className="mt-2 max-w-prose text-muted">{words.sourcesLead}</p>

        <ul className="mt-6 max-w-2xl">
          {data.sources.map((item) => (
            <li
              key={item.name ?? "unknown"}
              className="flex items-baseline justify-between gap-4 border-b border-line py-3"
            >
              <span className="truncate">{item.name ?? words.sourceUnknown}</span>
              <span className="font-mono text-sm text-muted">{item.total}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="text-2xl">{words.regionsTitle}</h2>
        <p className="mt-2 max-w-prose text-muted">{words.regionsLead}</p>

        <ul className="mt-6 max-w-2xl">
          {data.regions.map((item) => (
            <li
              key={item.name ?? "unknown"}
              className="flex items-baseline justify-between gap-4 border-b border-line py-3"
            >
              <span>{regionName(item.name)}</span>
              <span className="font-mono text-sm text-muted">{item.total}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
