import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";

/*
  «Проверь себя». Рубрика заведена, тестов пока нет — так и решено: сделать
  их функциональными в самом конце.

  Страница-заглушка написана честно: сказано, что тестов нет, почему их нет
  и куда пойти вместо них. Пустая страница с одним заголовком читалась бы
  как поломка, а обещание срока, которого мы не знаем, — как обман.
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
  return { title: dict.quizPage.title, description: dict.quizPage.lead };
}

export default async function QuizPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const words = dict.quizPage;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">{words.title}</h1>
        <p className="mt-4 text-lg text-muted">{words.lead}</p>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-2xl">{words.soonTitle}</h2>
          <p className="mt-3 text-muted">{words.soonBody}</p>
        </section>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-2xl">{words.meanwhileTitle}</h2>
          <p className="mt-3 text-muted">{words.meanwhileBody}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/${lang}/types`}
              className="inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
            >
              {words.toTypes}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/${lang}/glossary`}
              className="inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
            >
              {words.toGlossary}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
