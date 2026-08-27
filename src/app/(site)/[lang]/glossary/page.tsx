import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";

/*
  Глоссарий. Страница целиком из словаря — запросов к базе тут нет.

  Список определений, а не карточки: карточки заставляют глаз прыгать по
  сетке, а сюда приходят с одним словом и ищут его глазами по левому краю.
  Термин и определение стоят в две колонки на широком экране и друг под
  другом на телефоне — так в обоих случаях остаётся одна колонка чтения.
*/

type Params = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.glossaryPage.title, description: dict.glossaryPage.lead };
}

export default async function GlossaryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl sm:text-4xl">{dict.glossaryPage.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-muted">
        {dict.glossaryPage.lead}
      </p>

      {dict.glossary.map((group) => (
        <section key={group.title} className="mt-12 border-t border-line pt-8">
          <h2 className="text-2xl">{group.title}</h2>

          <dl className="mt-6">
            {group.entries.map((entry) => (
              <div
                key={entry.term}
                className="grid gap-x-10 gap-y-1 border-b border-line py-5 lg:grid-cols-[minmax(0,18rem)_1fr]"
              >
                <dt className="text-base" id={`term-${entry.term}`}>
                  {entry.term}
                </dt>
                <dd className="max-w-prose text-muted">
                  {entry.definition}

                  {/* Ссылка только у тех терминов, которым и правда есть куда
                      вести: у вида нарушений своя страница с законом и
                      примерами, у остальных её нет. */}
                  {entry.type ? (
                    <Link
                      href={`/${lang}/types/${entry.type}`}
                      className="mt-1 block text-sm text-signal hover:underline"
                    >
                      {dict.glossaryPage.typeLink}
                    </Link>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
