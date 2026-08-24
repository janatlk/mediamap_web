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
    /*
      Шапка страницы держится короткой намеренно. Человек пришёл сюда
      написать, а не читать: чем ниже уезжает первое поле, тем больше похоже
      на анкету, которую надо изучить, прежде чем заполнять.

      Ссылки на свои сообщения тут нет вовсе. Она стояла между вступлением и
      первым полем и отнимала сотню пикселей ровно на дороге у того, кто
      пришёл жаловаться, а под формой её всё равно никто не находил. Тем, кто
      вернулся смотреть решение, есть путь из шапки и по своей ссылке.
    */
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      {/* Колонка узкая — так читается текст и так заполняется форма. Но на
          широком экране, прижатая к левому краю, она оставляла справа шестьсот
          пикселей пустоты, и страница выглядела недоделанной. Поэтому центр. */}
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl sm:text-3xl">{dict.reportPage.title}</h1>
        <p className="mt-3 text-muted">{dict.reportPage.lead}</p>
      </div>

      <div className="mx-auto mt-8 max-w-2xl">
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
