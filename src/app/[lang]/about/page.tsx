import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { getDictionary, isReadyLanguage } from "@/lib/i18n";

// О проекте. Страница целиком из словаря — данных из базы тут нет.

type Params = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = getDictionary(lang);
  return { title: dict.aboutPage.title, description: dict.aboutPage.lead };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = getDictionary(lang);
  const about = dict.aboutPage;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">{about.title}</h1>
        <p className="mt-5 text-lg text-muted">{about.lead}</p>

        <section className="mt-12 border-t border-line pt-8">
          <h2 className="text-2xl">{about.howTitle}</h2>
          <p className="mt-3 text-muted">{about.how}</p>
        </section>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-2xl">{about.whyTitle}</h2>
          <p className="mt-3 text-muted">{about.why}</p>
        </section>

        {/* Донорская строка. Формулировку про CARAVAN, Internews и
            Евросоюз оставляем как есть — это обязательство перед теми,
            кто финансирует проект, а не наш текст. */}
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-2xl">{about.supportTitle}</h2>
          <p className="mt-3 text-muted">
            {about.supportIntro}{" "}
            <span className="text-ink">{about.supportCaravan}</span>
            {about.supportBody}
          </p>
        </section>

        <Link
          href={`/${lang}/contacts`}
          className="mt-12 inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
        >
          {about.contactsLink}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
