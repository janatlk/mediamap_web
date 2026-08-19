import type { Metadata } from "next";
import Link from "next/link";
import { Geologica, Golos_Text, JetBrains_Mono } from "next/font/google";

import { currentUser } from "@/lib/auth";
import { signOut } from "@/server/auth-actions";
import "../../globals.css";

// Каркас админки. Свой корневой макет, а не общий с сайтом: публичная
// шапка с языками и кнопкой «сообщить о нарушении» сотруднику не нужна,
// а служебные экраны не должны попадать в поиск.

const display = Geologica({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500"],
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
  title: { default: "Панель · MediaMap", template: "%s · Панель MediaMap" },
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/admin", label: "Очередь" },
  { href: "/admin/texts", label: "Тексты сайта" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Здесь только показать или не показать меню. Доступ к данным закрывает
  // каждая страница сама — иначе забытая страница окажется открытой.
  const user = await currentUser();

  return (
    <html
      lang="ru"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen" suppressHydrationWarning>
        {user ? (
          <header className="border-b border-line bg-paper">
            <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
              <Link
                href="/admin"
                className="font-display text-base font-medium whitespace-nowrap"
              >
                MediaMap · панель
              </Link>

              <nav className="flex items-center gap-5">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex h-11 items-center text-sm text-muted transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="ml-auto flex items-center gap-4">
                <span className="hidden text-sm text-muted sm:inline">
                  {user.name ?? user.email}
                </span>
                {/* Настоящий выход, а не ссылка на главную: в старой панели
                    кнопка «выйти» просто уводила на сайт, оставляя сессию. */}
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex h-10 items-center rounded-xs border border-border px-4 text-sm transition-colors hover:bg-surface"
                  >
                    Выйти
                  </button>
                </form>
              </div>
            </div>
          </header>
        ) : null}

        <main>{children}</main>
      </body>
    </html>
  );
}
