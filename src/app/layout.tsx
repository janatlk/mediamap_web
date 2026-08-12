import type { Metadata } from "next";
import { Geologica, Golos_Text, JetBrains_Mono } from "next/font/google";

import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { DEFAULT_LANG, getDictionary } from "@/lib/content";
import "./globals.css";

/*
  Три гарнитуры, три роли — и обе основные родом из кириллических студий.
  Для кыргызского это не мелочь: ө, ү и ң в латинских шрифтах часто
  нарисованы по остаточному принципу, а половина контента сайта на нём.

  Прежняя версия качала шесть семейств, две из которых не использовались
  ни разу.
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

export const metadata: Metadata = {
  title: {
    default: "MediaMap — карта нарушений в медиапространстве Кыргызстана",
    template: "%s · MediaMap",
  },
  description:
    "Карта нарушений в медиа Кыргызстана: язык вражды, дезинформация и пропаганда. " +
    "Заявки проходят проверку модератора.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const dict = getDictionary(DEFAULT_LANG);

  return (
    // Переменные шрифтов вешаем на html, чтобы они были видны из :root —
    // оттуда их берут и утилиты Tailwind, и базовые стили.
    <html
      lang={DEFAULT_LANG}
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-screen">
        {/* Первая цель при табуляции: пропустить шапку и уйти к содержанию. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[300] focus:rounded-xs focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-surface"
        >
          {dict.a11y.skipToContent}
        </a>

        <Header dict={dict} />
        <main id="content">{children}</main>
        <Footer dict={dict} />
      </body>
    </html>
  );
}
