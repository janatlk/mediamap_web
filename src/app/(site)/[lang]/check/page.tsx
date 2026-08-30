import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CheckForm from "@/components/check/CheckForm";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";

/*
  Проверка изображения: нарисовано моделью или снято.

  Оговорка о пределах стоит до кнопки, а не под ответом. Человек, который
  уже получил ответ, читать её не станет — а понимать пределы надо до того,
  как на этот ответ где-нибудь сошлются.

  Разбор ничего не сохраняет: файл приходит, читается в памяти и уходит.
  Рубрика открыта всем и без входа, и держать чужие картинки у себя мы не
  подписывались.
*/

export const dynamic = "force-dynamic";

type Params = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.checkPage.title, description: dict.checkPage.lead };
}

export default async function CheckPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const words = dict.checkPage;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">{words.title}</h1>
        <p className="mt-4 text-lg text-muted">{words.lead}</p>

        <section className="mt-8 border-l-2 border-line pl-5">
          <h2 className="text-lg">{words.limitsTitle}</h2>
          <p className="mt-2 max-w-prose text-muted">{words.limitsFile}</p>
          <p className="mt-3 max-w-prose text-muted">{words.limitsGuess}</p>
          {/* Файл уходит третьим лицам. Обещание «мы не храним» правдиво, но
              неполно, а неполная правда тут хуже полного молчания. */}
          <p className="mt-3 max-w-prose text-muted">{words.limitsThirdParty}</p>
        </section>

        <div className="mt-10">
          <CheckForm dict={dict} />
          <p className="mt-3 text-sm text-muted">{words.formats}</p>
        </div>
      </div>
    </div>
  );
}
