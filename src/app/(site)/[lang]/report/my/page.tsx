import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MyReports from "@/components/report/MyReports";
import { currentUser } from "@/lib/auth";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";

// Свои сообщения. Список живёт в браузере, поэтому страница почти пустая:
// всю работу делает клиентский компонент.

type Params = { lang: string };

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
    title: dict.myReports.title,
    robots: { index: false, follow: false },
  };
}

export default async function MyReportsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const page = dict.myReports;
  const signedIn = (await currentUser()) !== null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">{page.title}</h1>
        <p className="mt-4 text-lg text-muted">
          {signedIn ? page.leadAccount : page.lead}
        </p>

        {/* Оговорка про браузер нужна только гостям: у вошедшего сообщения
            привязаны к аккаунту и от браузера не зависят. */}
        {signedIn ? null : (
          <p className="mt-4 border-l-2 border-line pl-4 text-sm text-muted">
            {page.warning}
          </p>
        )}

        <MyReports dict={dict} lang={lang} signedIn={signedIn} />
      </div>
    </div>
  );
}
