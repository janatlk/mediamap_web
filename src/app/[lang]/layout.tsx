import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geologica, Golos_Text, JetBrains_Mono } from "next/font/google";

import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { READY_LANGUAGES, getDictionary, isReadyLanguage } from "@/lib/i18n";
import "../globals.css";

/*
  Корневой макет. Он живёт внутри [lang], потому что атрибут lang у тега
  html обязан совпадать с языком страницы: без этого браузер и скринридер
  читают кыргызский текст по правилам русского.

  Три гарнитуры, три роли, обе основные родом из кириллических студий —
  для кыргызского это важно: ө, ү и ң в латинских шрифтах часто нарисованы
  по остаточному принципу.
*/

const display = Geologica({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-geologica",
  display: "swap",
});

const sans = Golos_Text({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-golos",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500"],
  variable: "--font-mono-jb",
  display: "swap",
});

/** Страницы есть только у языков, для которых готов перевод. */
export const generateStaticParams = () =>
  READY_LANGUAGES.map((lang) => ({ lang }));

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = getDictionary(lang);

  return {
    title: { default: `${dict.brand} — ${dict.brandTagline}`, template: `%s · ${dict.brand}` },
    description: dict.home.lead,
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = getDictionary(lang);

  return (
    // suppressHydrationWarning стоит только на html и body и только потому,
    // что их атрибуты у нас полностью статичны: расхождение здесь не может
    // прийти из нашего кода. Зато его регулярно создают расширения браузера,
    // дописывая свои атрибуты до подключения React.
    <html
      lang={lang}
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen" suppressHydrationWarning>
        {/* Первая цель при табуляции: пропустить шапку и уйти к содержанию. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[300] focus:rounded-xs focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-surface"
        >
          {dict.a11y.skipToContent}
        </a>

        <Header dict={dict} lang={lang} />
        <main id="content">{children}</main>
        <Footer dict={dict} lang={lang} />
      </body>
    </html>
  );
}
