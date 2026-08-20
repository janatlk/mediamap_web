import { notFound } from "next/navigation";

import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import CaseFeed from "@/components/home/CaseFeed";
import ViolationTypes from "@/components/home/ViolationTypes";
import AiTeaser from "@/components/home/AiTeaser";
import NewsList from "@/components/home/NewsList";
import HowItWorks from "@/components/home/HowItWorks";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { getHomeData } from "@/server/home-data";

// Тут только порядок разделов. Разметка — в компонентах, запросы —
// в src/server/home-data.ts.
//
// Порядок такой, в каком человек задаёт вопросы: что это → сколько собрано
// → какие случаи → что считается нарушением → что будет позже → что вокруг
// → что будет, если напишу.

// Данные меняются от проверок, а не каждую секунду.
export const revalidate = 300;

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const data = await getHomeData();

  return (
    <>
      <Hero dict={dict} lang={lang} />

      <Stats
        dict={dict}
        lang={lang}
        caseCount={data.caseCount}
        typeCount={data.types.length}
        sourceCount={data.sourceCount}
        newsCount={data.newsCount}
      />

      <CaseFeed
        dict={dict}
        lang={lang}
        cases={data.cases}
        types={data.types}
        total={data.caseCount}
      />

      <ViolationTypes dict={dict} lang={lang} types={data.types} />

      <AiTeaser dict={dict} />

      <NewsList dict={dict} lang={lang} news={data.news} />

      <HowItWorks dict={dict} lang={lang} />
    </>
  );
}
