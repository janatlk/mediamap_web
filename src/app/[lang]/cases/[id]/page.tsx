import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { formatDate } from "@/lib/format";
import { getDictionary, isReadyLanguage, violationText } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";
import { loadCase } from "@/server/case-data";

// Страница одного случая. Открывается по публичному номеру — тому, что
// человек называет по телефону, а не по внутреннему id.

export const revalidate = 300;

type Params = { lang: string; id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isReadyLanguage(lang)) return {};

  const dict = getDictionary(lang);
  const item = await loadCase(id);
  if (!item) return { title: dict.cases.notFound };

  return {
    title: `${violationText(dict, item.typeSlug)?.name ?? item.typeSlug} · ${item.publicId}`,
    description: dict.cases.detailLead,
  };
}

/** Пара «подпись — значение». Их на странице несколько, вид у всех один. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-base">{children}</dd>
    </div>
  );
}

export default async function CasePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang, id } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = getDictionary(lang);
  const item = await loadCase(id);

  // Не 404, а объяснение: номер могли продиктовать с ошибкой, и человеку
  // полезнее понять, что случилось, чем упереться в системную страницу.
  if (!item) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
        <h1 className="text-3xl">{dict.cases.notFound}</h1>
        <p className="mt-4 max-w-prose text-muted">{dict.cases.notFoundLead}</p>
        <Link
          href={`/${lang}/cases`}
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {dict.cases.backToList}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <Link
        href={`/${lang}/cases`}
        className="inline-flex min-h-9 items-center gap-2 py-2 text-sm text-signal hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {dict.cases.backToList}
      </Link>

      <div className="mt-6 max-w-3xl">
        <p className="eyebrow">{dict.cases.detailLead}</p>

        <h1 className="mt-3 flex items-center gap-3 text-3xl sm:text-4xl">
          <span
            className={`h-3 w-3 shrink-0 rounded-full ${typeColor(item.typeSlug)}`}
            aria-hidden="true"
          />
          {violationText(dict, item.typeSlug)?.name ?? item.typeSlug}
        </h1>

        <dl className="mt-10">
          <Field label={dict.cases.number}>
            <span className="font-mono">{item.publicId}</span>
          </Field>

          <Field label={dict.cases.checkedAt}>
            <span className="tabular-nums">
              {formatDate(item.checkedAt, lang)}
            </span>
          </Field>

          <Field label={dict.cases.where}>
            {item.link ? (
              <>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-signal hover:underline"
                >
                  {item.source ?? item.link}
                  <ArrowUpRight
                    className="ml-1 inline h-4 w-4 align-baseline"
                    aria-hidden="true"
                  />
                  <span className="sr-only">{dict.a11y.externalLink}</span>
                </a>
                {/* Публикацию могли снести после проверки — предупреждаем,
                    чтобы ссылка в никуда не выглядела нашей недоработкой. */}
                <p className="mt-2 text-sm text-muted">{dict.cases.linkGone}</p>
              </>
            ) : (
              <span className="text-muted">{dict.home.caseSourceUnknown}</span>
            )}

            {item.city ? (
              <p className="mt-1 text-sm text-muted">{item.city}</p>
            ) : null}
          </Field>

          <Field label={dict.cases.fromAuthor}>
            {item.authorComment ?? (
              <span className="text-muted">{dict.cases.noComment}</span>
            )}
          </Field>

          <Field label={dict.cases.fromTeam}>
            {item.moderatorComment ?? (
              <span className="text-muted">{dict.cases.noComment}</span>
            )}
          </Field>
        </dl>
      </div>
    </div>
  );
}
