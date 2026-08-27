import { notFound } from "next/navigation";

import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import CaseFeed from "@/components/home/CaseFeed";
import ViolationTypes from "@/components/home/ViolationTypes";
import NewsList from "@/components/home/NewsList";
import HowItWorks from "@/components/home/HowItWorks";
import ReportCta from "@/components/home/ReportCta";
import Partners from "@/components/site/Partners";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { getHomeData } from "@/server/home-data";

// Тут только порядок разделов. Разметка — в компонентах, запросы —
// в src/server/home-data.ts.
//
// Порядок задан проектом и идёт от чужого к своему: сначала человек узнаёт,
// что здесь считается нарушением, потом его зовут написать, потом
// показывают, что будет после, и только затем — уже разобранные случаи.
// Раньше список случаев стоял третьим, до объяснения видов, и человек
// упирался в него, не зная, что это за виды.
//
// Дайджест и баннеры доноров идут в конце: это не то, ради чего сюда
// приходят, но и прятать их незачем.

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

      <ViolationTypes dict={dict} lang={lang} types={data.types} />

      <ReportCta dict={dict} lang={lang} />

      <HowItWorks dict={dict} />

      <CaseFeed
        dict={dict}
        lang={lang}
        cases={data.cases}
        types={data.types}
        total={data.caseCount}
      />

      <NewsList dict={dict} lang={lang} news={data.news} />

      <Partners dict={dict} />
    </>
  );
}
