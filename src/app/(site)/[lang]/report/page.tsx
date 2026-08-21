import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
    /*
      Шапка страницы держится короткой намеренно. Человек пришёл сюда
      написать, а не читать: чем ниже уезжает первое поле, тем больше похоже
      на анкету, которую надо изучить, прежде чем заполнять.

      Ссылка «Мои сообщения» уехала под форму. Она стояла между вступлением
      и первым полем и отнимала сотню пикселей ровно на дороге у того, кто
      пришёл жаловаться. Тем, кто вернулся смотреть решение, есть путь из
      шапки и по своей ссылке.
    */
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="max-w-2xl">
        <h1 className="text-2xl sm:text-3xl">{dict.reportPage.title}</h1>
        <p className="mt-3 text-muted">{dict.reportPage.lead}</p>
      </div>

      <div className="mt-8">
        <ReportForm
          dict={dict}
          lang={lang}
          types={types.map((type) => ({
            slug: type.slug,
            name: violationText(dict, type.slug)?.name ?? type.slug,
          }))}
        />

        <Link
          href={`/${lang}/report/my`}
          className="mt-10 inline-flex min-h-11 items-center gap-1.5 text-sm text-signal hover:underline"
        >
          {dict.myReports.link}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
