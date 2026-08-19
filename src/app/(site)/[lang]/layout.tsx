import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geologica, Golos_Text, JetBrains_Mono } from "next/font/google";

import Header from "@/components/site/Header";
import { currentUser } from "@/lib/auth";
import { isStaff } from "@/lib/enums";
import Footer from "@/components/site/Footer";
import { READY_LANGUAGES, isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import "../../globals.css";

// Корневой макет лежит внутри [lang]: атрибут lang у html должен совпадать
// с языком страницы, иначе скринридер читает кыргызский по русским правилам.
//
// Три гарнитуры на три роли. Обе основные — из кириллических студий: ө, ү и
// ң в латинских шрифтах рисуют по остаточному принципу.

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
  const dict = await getContent(lang);

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

  const dict = await getContent(lang);

  // Шапке нужно знать лишь две вещи: вошёл ли человек и сотрудник ли он.
  // Ни почты, ни роли целиком в браузер не отдаём.
  const user = await currentUser();
  const account = user
    ? { name: user.name ?? user.email, staff: isStaff(user.role) }
    : null;

  return (
    // suppressHydrationWarning только тут: атрибуты у html и body статичные,
    // своё расхождение взяться неоткуда. А расширения браузера дописывают
    // сюда своё до того, как поднимется React.
    <html
      lang={lang}
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen" suppressHydrationWarning>
        {/* Первый таб — сразу к содержанию, мимо шапки. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[300] focus:rounded-xs focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-surface"
        >
          {dict.a11y.skipToContent}
        </a>

        <Header dict={dict} lang={lang} account={account} />
        <main id="content">{children}</main>
        <Footer dict={dict} lang={lang} />
      </body>
    </html>
  );
}
