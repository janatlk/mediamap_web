import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";

/*
  «Проверь себя». Пока заглушка: вопросы делаются в последнюю очередь, так
  решил проект.

  Заглушка честная, а не «скоро»: сказано, из чего будут вопросы и почему
  сроков нет, — и тут же дано, куда пойти вместо теста. Страница-обещание
  без выхода читается как тупик, а рубрика уже стоит в навигации.
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
  const quiz = dict.quizPage;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">{quiz.title}</h1>
        <p className="mt-4 text-lg text-muted">{quiz.lead}</p>

        <section className="mt-12 border-t border-line pt-8">
          <h2 className="text-2xl">{quiz.soonTitle}</h2>
          <p className="mt-3 text-muted">{quiz.soonBody}</p>
        </section>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-2xl">{quiz.meanwhileTitle}</h2>
          <p className="mt-3 text-muted">{quiz.meanwhileBody}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${lang}/types`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
            >
              {quiz.toTypes}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/${lang}/glossary`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
            >
              {quiz.toGlossary}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
