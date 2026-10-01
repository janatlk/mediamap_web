import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import Quiz from "@/components/quiz/Quiz";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { loadQuiz } from "@/server/quiz";

/*
  «Проверь себя».

  Вопросы заводит редакция в панели. Пока их нет, страница честно говорит об
  этом и уводит к видам нарушений и глоссарию: пустая страница с одним
  заголовком читается как поломка.
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
  const questions = await loadQuiz(lang);

  if (questions.length > 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl">{words.title}</h1>
          <p className="mt-4 text-lg text-muted">{words.lead}</p>

          <Quiz dict={dict} questions={questions} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="max-w-3xl">
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
