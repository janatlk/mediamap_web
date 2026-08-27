import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { CONTACTS } from "@/lib/contacts";
import { RESOURCE_GROUPS, type ResourceGroup } from "@/lib/resources";
import { isReadyLanguage, type Dictionary } from "@/lib/i18n";
import { getContent } from "@/server/content";

/*
  Полезные ресурсы. Названия и адреса — данные из src/lib/resources.ts,
  пояснения — текст из словаря; почему так, написано в самом resources.ts.

  Все ссылки уводят с сайта, поэтому у каждой стрелка и подпись для
  скринридера: человек должен понимать, что уходит к чужим, до нажатия, а
  не после.
*/

type Params = { lang: string };

const groupTitle = (dict: Dictionary, id: ResourceGroup["id"]) =>
  ({
    verify: dict.resourcesPage.groupVerify,
    factcheck: dict.resourcesPage.groupFactcheck,
    freedom: dict.resourcesPage.groupFreedom,
  })[id];

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.resourcesPage.title, description: dict.resourcesPage.lead };
}

export default async function ResourcesPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const notes = dict.resourcesPage.notes as Record<string, string | undefined>;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl sm:text-4xl">{dict.resourcesPage.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-muted">
        {dict.resourcesPage.lead}
      </p>

      {RESOURCE_GROUPS.map((group) => (
        <section key={group.id} className="mt-12 border-t border-line pt-8">
          <h2 className="text-2xl">{groupTitle(dict, group.id)}</h2>

          <ul className="mt-6">
            {group.items.map((item) => (
              <li key={item.id} className="border-b border-line">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block py-5"
                >
                  <span className="text-base group-hover:text-signal">
                    {item.name}
                    <ArrowUpRight
                      className="ml-1 inline h-3.5 w-3.5 align-baseline text-muted"
                      aria-hidden="true"
                    />
                    <span className="sr-only">{dict.a11y.externalLink}</span>
                  </span>
                  <span className="mt-1 block max-w-prose text-sm text-muted">
                    {notes[item.id]}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Пустоту на месте местных ресурсов называем вслух. Молча оставленный
          международный список читался бы как «местных и нет». */}
      <section className="mt-12 border-t border-line pt-8">
        <h2 className="text-2xl">{dict.resourcesPage.localTitle}</h2>
        <p className="mt-3 max-w-prose text-muted">
          {dict.resourcesPage.localBody}
        </p>
        <a
          href={`mailto:${CONTACTS.email}`}
          className="mt-4 inline-flex min-h-11 items-center text-signal hover:underline"
        >
          {CONTACTS.email}
        </a>
      </section>
    </div>
  );
}
