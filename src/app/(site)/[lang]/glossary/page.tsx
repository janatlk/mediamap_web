import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";

/*
  Глоссарий. Данных из базы тут нет — страница целиком из словаря.

  Список плоский и в один столбец, без алфавитного указателя и без поиска:
  слов полтора десятка, и указатель к ним был бы оглавлением длиннее самого
  текста. Поиск по сайту умеет искать и здесь.
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
  const entries = Object.entries(dict.glossary);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">{dict.glossaryPage.title}</h1>
        <p className="mt-4 text-lg text-muted">{dict.glossaryPage.lead}</p>

        <dl className="mt-10">
          {entries.map(([id, entry]) => (
            <div key={id} className="border-t border-line py-6">
              <dt className="text-xl">{entry.term}</dt>
              <dd className="mt-2 text-muted">{entry.body}</dd>

              {/* У трёх наших видов есть подробная страница — пересказывать
                  её здесь незачем, достаточно довести до неё. */}
              {entry.type ? (
                <dd className="mt-3">
                  <Link
                    href={`/${lang}/types/${entry.type}`}
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm text-signal hover:underline"
                  >
                    {dict.glossaryPage.typeLink}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
