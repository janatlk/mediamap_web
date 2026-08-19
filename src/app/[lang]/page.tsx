import { notFound } from "next/navigation";

import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import CaseFeed from "@/components/home/CaseFeed";
import ViolationTypes from "@/components/home/ViolationTypes";
import AiTeaser from "@/components/home/AiTeaser";
import NewsList from "@/components/home/NewsList";
import HowItWorks from "@/components/home/HowItWorks";
import { getDictionary, isReadyLanguage } from "@/lib/i18n";
import { getHomeData } from "@/server/home-data";

/*
  Главная страница. Здесь только порядок разделов — вся разметка живёт в
  компонентах, все запросы к базе в src/server/home-data.ts.

  Порядок отвечает на вопросы в том порядке, в каком человек их задаёт:
  что это за место → сколько тут собрано → какие случаи → что считается
  нарушением → что появится позже → что вокруг → что будет, если я напишу.
*/

// Данные меняются от проверки сообщений, а не каждую секунду.
export const revalidate = 300;

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = getDictionary(lang);
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
