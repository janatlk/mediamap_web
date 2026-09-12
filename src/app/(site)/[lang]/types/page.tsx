import { getContent } from "@/server/content";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import {
  FORMS,
  isReadyLanguage,
  violationText,
} from "@/lib/i18n";
import { withCount } from "@/lib/plural";
import { typeColor } from "@/lib/violation-types";
import { loadViolationTypes } from "@/server/violations";

// Общая страница видов: коротко про каждый и переход к подробностям.

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
  return { title: dict.typesPage.title, description: dict.typesPage.lead };
}

export default async function TypesPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const types = await loadViolationTypes();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl sm:text-4xl">{dict.typesPage.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-muted">
        {dict.typesPage.lead}
      </p>

      <ul className="mt-10 grid gap-px bg-line sm:grid-cols-3">
        {types.map((type) => {
          const text = violationText(dict, type.slug);

          return (
            <li key={type.slug} className="bg-paper">
              <Link
                href={`/${lang}/types/${type.slug}`}
                className="flex h-full flex-col bg-surface p-6 transition-colors hover:bg-paper"
              >
                <span
                  className={`h-1 w-10 ${typeColor(type.slug)}`}
                  aria-hidden="true"
                />

                <h2 className="mt-4 text-xl">{text?.name ?? type.slug}</h2>
                <p className="mt-3 flex-1 text-muted">{text?.summary}</p>

                <p className="mt-6 text-sm text-muted">
                  {type.count > 0
                    ? withCount(type.count, FORMS[lang].cases, lang)
                    : dict.home.typesEmpty}
                </p>

                <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-signal">
                  {dict.typesPage.about}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Печатаем статьи Уголовного кодекса — надо сказать, что это
          справка, а не заключение. */}
      <p className="mt-10 max-w-prose text-sm text-muted">
        {dict.typesPage.disclaimer}
      </p>
    </div>
  );
}
