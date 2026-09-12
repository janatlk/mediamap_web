import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";

// О проекте. Страница целиком из словаря — данных из базы тут нет.

type Params = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.aboutPage.title, description: dict.aboutPage.lead };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const about = dict.aboutPage;

  return (
    // Колонка текста узкая — так его читают. Но приклеенная к левому краю
    // широкого экрана, она оставляла справа пустую половину, и страница
    // выглядела недоделанной. Поэтому колонка по центру.
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
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

        {/* Что готовим. Раньше это был целый блок на главной — человек,
            пришедший сообщить о нарушении, читал обещание вместо дела.
            Здесь строчка уместна: страница как раз про проект. */}
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-2xl">{about.soonTitle}</h2>
          <p className="mt-3 text-muted">{about.soon}</p>
        </section>

        {/* Донорская строка. Текст прислан проектом дословно и правится
            только проектом — это обязательство перед теми, кто финансирует
            работу, а не наш материал.

            Оговорка об ответственности отбита линейкой и набрана мельче:
            это правовая приписка, а не продолжение рассказа. */}
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-2xl">{about.supportTitle}</h2>
          {about.supportBody.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mt-3 text-muted">
              {paragraph}
            </p>
          ))}
          <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
            {about.supportDisclaimer}
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
