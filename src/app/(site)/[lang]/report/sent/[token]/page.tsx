import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import AssessmentCard from "@/components/report/AssessmentCard";
import Attachments from "@/components/report/Attachments";
import RememberReceipt from "@/components/report/RememberReceipt";
import { currentUser } from "@/lib/auth";
import { REPORT_STATUS } from "@/lib/enums";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { loadReceipt } from "@/server/case-data";
import type { Verdict } from "@/server/ai-review";

// «Сообщение принято» — своя страница со своим адресом.
//
// Раньше это было другое состояние формы: адрес не менялся, над экраном
// висел заголовок «Сообщить о нарушении», а обновление страницы всё
// стирало. Теперь по ссылке можно вернуться позже и увидеть решение.
//
// Адрес держится на случайном ключе, а не на номере: MM-2026-0001
// угадывается с первой попытки, а сообщение до проверки не опубликовано.

// Кэшировать нечего: человек приходит сюда узнать текущее решение.
export const dynamic = "force-dynamic";

type Params = { lang: string; token: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  // Страница личная — в поиск ей нельзя.
  return {
    title: dict.reportPage.doneTitle,
    robots: { index: false, follow: false },
  };
}

export default async function SentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang, token } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const page = dict.reportPage;
  const receipt = await loadReceipt(token);

  // Неверная ссылка — объясняем, а не отдаём системную страницу ошибки.
  if (!receipt) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl">{page.receiptNotFound}</h1>
          <p className="mt-4 text-muted">{page.receiptNotFoundLead}</p>
          <Link
            href={`/${lang}/report`}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {page.title}
          </Link>
        </div>
      </div>
    );
  }

  const isPublished = receipt.status === REPORT_STATUS.APPROVED;
  // Вошедшему предлагать аккаунт незачем — он у него уже есть.
  const signedIn = (await currentUser()) !== null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      {/* Колонка та же, что у формы, и так же по центру. Человек приходит
          сюда прямо с формы, и страница не должна на глазах прыгать влево и
          становиться шире — это читается как «меня перекинуло не туда». */}
      <div className="mx-auto max-w-2xl">
        <h1 className="flex items-center gap-3 text-3xl sm:text-4xl">
          <Check className="h-7 w-7 text-signal" aria-hidden="true" />
          {page.doneTitle}
        </h1>
        <p className="mt-4 text-lg text-muted">{page.doneLead}</p>

        {/* Запоминаем в браузере: ссылку легко потерять, а список своих
            сообщений остаётся. */}
        <RememberReceipt token={token} publicId={receipt.publicId} />

        <div className="mt-8 border border-line bg-surface p-6">
          <p className="text-sm text-muted">{page.doneNumber}</p>
          <p className="mt-1 font-mono text-2xl">{receipt.publicId}</p>
          <p className="mt-4 max-w-prose text-sm text-muted">
            {signedIn ? null : (
              <Link
                href={`/${lang}/account/register`}
                className="text-signal hover:underline"
              >
                {page.doneAccountHint}
              </Link>
            )}
          </p>
        </div>

        {/* Что человек написал. Через день он этого уже не помнит, а до сих
            пор на странице были только номер и вид — узнать своё сообщение
            было не по чему. */}
        {receipt.story ? (
          <div className="mt-8 border border-line bg-surface p-6">
            <p className="text-sm text-muted">{page.doneYourText}</p>
            <p className="mt-2 max-w-prose whitespace-pre-line">{receipt.story}</p>

            {receipt.link ? (
              <p className="mt-4 text-sm">
                <a
                  href={receipt.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="break-all text-signal hover:underline"
                >
                  {receipt.link}
                </a>
              </p>
            ) : null}

            {receipt.city ? (
              <p className="mt-1 text-sm text-muted">{receipt.city}</p>
            ) : null}
          </div>
        ) : null}

        <Attachments
          items={receipt.attachments}
          token={token}
          title={page.filesChosen}
        />

        {receipt.ai ? (
          <AssessmentCard
            dict={dict}
            status={receipt.status}
            chosenType={receipt.typeSlug}
            checks={receipt.ai.checks}
            reviewed={receipt.reviewed}
            moderatorComment={receipt.moderatorComment}
            reviewSummary={receipt.reviewSummary}
            overridden={receipt.overridden}
            terminology={receipt.terminology}
            basis={receipt.basis}
            hasLink={Boolean(receipt.link)}
            assessment={{
              verdict: receipt.ai.verdict as Verdict,
              confidence: receipt.ai.confidence,
              explanation: receipt.ai.explanation,
              reasons: receipt.ai.reasons,
              source: receipt.ai.source,
            }}
          />
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/${lang}/report`}
            className="inline-flex h-12 items-center justify-center rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
          >
            {page.doneAnother}
          </Link>

          <Link
            href={`/${lang}/report/my`}
            className="inline-flex h-12 items-center justify-center rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
          >
            {dict.myReports.link}
          </Link>

          {/* Пока не опубликовано — вести на карточку случая некуда. */}
          <Link
            href={
              isPublished
                ? `/${lang}/cases/${receipt.publicId}`
                : `/${lang}/cases`
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xs bg-ink px-6 text-base font-medium text-surface"
          >
            {isPublished ? page.donePublished : page.doneToCases}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
