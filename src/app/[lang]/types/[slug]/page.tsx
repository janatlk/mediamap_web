import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import {
  FORMS,
  getDictionary,
  isReadyLanguage,
  violationText,
  type Dictionary,
} from "@/lib/i18n";
import { withCount } from "@/lib/plural";
import { typeColor } from "@/lib/violation-types";
import { loadViolationTypes } from "@/server/violations";

// Подробности одного вида: что это, что говорит закон, что грозит и как
// выглядит на практике. Все слова из словаря, из базы только счётчик.

export const revalidate = 300;

type Params = { lang: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isReadyLanguage(lang)) return {};

  const dict = getDictionary(lang);
  const text = violationText(dict, slug);
  if (!text) return { title: dict.typesPage.notFound };

  return { title: text.name, description: text.summary };
}

/** Раздел с заголовком. Их на странице несколько, вид у всех один. */
function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-6">
      <h2 className="text-sm text-muted">{title}</h2>
      <div className="mt-2 text-base">{children}</div>
    </section>
  );
}

/** Сообщение о неизвестном виде. Ссылка назад обязательна. */
function NotFound({ dict, lang }: { dict: Dictionary; lang: string }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
      <h1 className="text-3xl">{dict.typesPage.notFound}</h1>
      <p className="mt-4 max-w-prose text-muted">
        {dict.typesPage.notFoundLead}
      </p>
      <Link
        href={`/${lang}/types`}
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {dict.typesPage.backToTypes}
      </Link>
    </div>
  );
}

export default async function TypePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang, slug } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = getDictionary(lang);
  const text = violationText(dict, slug);

  if (!text) return <NotFound dict={dict} lang={lang} />;

  const types = await loadViolationTypes();
  const count = types.find((type) => type.slug === slug)?.count ?? 0;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <Link
        href={`/${lang}/types`}
        className="inline-flex min-h-9 items-center gap-2 py-2 text-sm text-signal hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {dict.typesPage.backToTypes}
      </Link>

      <div className="mt-6 max-w-3xl">
        <h1 className="flex items-center gap-3 text-3xl sm:text-4xl">
          <span
            className={`h-3 w-3 shrink-0 rounded-full ${typeColor(slug)}`}
            aria-hidden="true"
          />
          {text.name}
        </h1>

        <p className="mt-4 text-lg text-muted">{text.summary}</p>

        <div className="mt-10">
          <Block title={dict.typesPage.about}>{text.about}</Block>

          <Block title={dict.typesPage.legal}>{text.legal}</Block>

          <Block title={dict.typesPage.penalty}>{text.penalty}</Block>

          <Block title={dict.typesPage.examples}>
            <ul className="space-y-3">
              {text.examples.map((example) => (
                <li key={example} className="flex gap-3">
                  <span
                    className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${typeColor(slug)}`}
                    aria-hidden="true"
                  />
                  {example}
                </li>
              ))}
            </ul>
          </Block>
        </div>

        {/* Ведём к случаям только если они есть: ссылка на пустой список
            выглядит обещанием, которого мы не выполняем. */}
        {count > 0 ? (
          <Link
            href={`/${lang}/cases?type=${slug}`}
            className="mt-10 inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep"
          >
            {dict.typesPage.casesLink}
            <span className="font-mono text-sm">
              {withCount(count, FORMS[lang].cases, lang)}
            </span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <p className="mt-10 text-muted">{dict.typesPage.casesNone}</p>
        )}

        <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
          {dict.typesPage.disclaimer}
        </p>
      </div>
    </div>
  );
}
