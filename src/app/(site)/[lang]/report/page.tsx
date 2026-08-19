import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ReportForm from "@/components/report/ReportForm";
import { isReadyLanguage, violationText } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { loadViolationTypes } from "@/server/violations";

// Страница подачи сообщения. Виды тянем из базы, названия — из словаря.

type Params = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.reportPage.title, description: dict.reportPage.lead };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const types = await loadViolationTypes();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">{dict.reportPage.title}</h1>
        <p className="mt-4 text-lg text-muted">{dict.reportPage.lead}</p>
      </div>

      <div className="mt-10">
        <ReportForm
          dict={dict}
          lang={lang}
          types={types.map((type) => ({
            slug: type.slug,
            name: violationText(dict, type.slug)?.name ?? type.slug,
          }))}
        />
      </div>
    </div>
  );
}
