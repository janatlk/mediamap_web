import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { isReadyLanguage } from "@/lib/i18n";
import { RESOURCE_GROUPS } from "@/lib/resources";
import { getContent } from "@/server/content";

/*
  Полезные ресурсы: перечень названий и ссылок.

  Все ссылки уводят на чужие сайты, и это сказано и в подводке, и стрелкой
  у каждой. Ставим rel="nofollow": мы за эти сайты не ручаемся, и наш вес в
  поиске им передавать не за что.
*/

export const revalidate = 3600;

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
    title: dict.resourcesPage.title,
    description: dict.resourcesPage.lead,
  };
}

export default async function ResourcesPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const words = dict.resourcesPage;

  const heading = {
    verify: words.groupVerify,
    factcheck: words.groupFactcheck,
    freedom: words.groupFreedom,
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">{words.title}</h1>
        <p className="mt-4 text-lg text-muted">{words.lead}</p>

        {RESOURCE_GROUPS.map((group) => (
          <section key={group.id} className="mt-10 border-t border-line pt-8">
            <h2 className="text-2xl">{heading[group.id]}</h2>

            <ul className="mt-5">
              {group.items.map((item) => (
                <li key={item.id} className="border-b border-line py-4">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="group block"
                  >
                    <span className="text-lg group-hover:text-signal">
                      {item.name}
                      <ArrowUpRight
                        className="ml-1 inline h-4 w-4 align-baseline text-muted"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{dict.a11y.externalLink}</span>
                    </span>
                  </a>
                  <p className="mt-1 text-muted">
                    {words.notes[item.id as keyof typeof words.notes]}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* Отсутствие местных ссылок надо объяснить: иначе страница про
            Кыргызстан без единого кыргызстанского ресурса выглядит
            недоделанной, а она такая намеренно. */}
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-xl">{words.localTitle}</h2>
          <p className="mt-2 text-muted">{words.localBody}</p>
        </section>
      </div>
    </div>
  );
}
