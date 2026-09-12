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
import { localizeHeadlines } from "@/server/case-data";
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

// Ритм разделов: 56px на телефоне, 96px на широком экране. Раньше
// все разделы шли с телефонным отступом и на десктопе, и главная
// выглядела сжатой, хотя пустоты на ней хватало. Цифры — в самих
// компонентах, по одному правилу: py-14 sm:py-16 lg:py-24.
// Фон чередуется: два белых раздела подряд («Случаи» и «Дайджест»)
// сливались в одну длинную простыню.

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
  await localizeHeadlines(data.cases, lang);

  return (
    <>
      <Hero dict={dict} lang={lang} latest={data.cases.slice(0, 3)} />

      <Stats
        dict={dict}
        lang={lang}
        caseCount={data.caseCount}
        receivedCount={data.receivedCount}
        reviewDays={data.reviewDays}
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
        platforms={data.platforms}
      />

      <NewsList dict={dict} lang={lang} news={data.news} />

      <Partners dict={dict} />
    </>
  );
}
