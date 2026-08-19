import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MyReports from "@/components/report/MyReports";
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

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">{page.title}</h1>
        <p className="mt-4 text-lg text-muted">{page.lead}</p>

        {/* Ограничение проговариваем сразу, а не после того, как человек
            обнаружит пустой список на другом устройстве. */}
        <p className="mt-4 border-l-2 border-line pl-4 text-sm text-muted">
          {page.warning}
        </p>

        <MyReports dict={dict} lang={lang} />
      </div>
    </div>
  );
}
