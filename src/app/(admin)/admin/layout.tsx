import type { Metadata } from "next";
import Link from "next/link";

import { currentUser } from "@/lib/auth";
import { signOut } from "@/server/auth-actions";
import "./admin.css";

/*
  Каркас панели.

  Свой корневой макет, а не общий с сайтом: публичная шапка с языками и кнопкой
  «сообщить о нарушении» сотруднику не нужна, а служебные экраны не должны
  попадать в поиск.

  Ни своих шрифтов, ни globals.css здесь намеренно нет. Панель — служебный
  экран, ему идут браузерные умолчания: грузится мгновенно, читается везде и не
  требует сопровождения. Всё оформление — admin.css, полсотни строк.
*/

export const metadata: Metadata = {
  title: { default: "Панель · MediaMap", template: "%s · Панель MediaMap" },
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/admin", label: "Сообщения" },
  { href: "/admin/ai", label: "Контроль ИИ" },
  { href: "/admin/news", label: "Дайджест" },
  { href: "/admin/texts", label: "Тексты сайта" },
];

/*
  Выход на сам сайт.

  У панели свой корневой макет, без общей шапки, и попасть отсюда на сайт
  было нечем: сотрудник правил адрес руками или лез в закладки. Отдельно от
  списка разделов и отдельно от «Выйти» — это не раздел панели и не выход из
  учётной записи, а «посмотреть, как это выглядит снаружи».
*/
const SITE = "/ru";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Здесь только показать или не показать меню. Доступ к данным закрывает
  // каждая страница сама — иначе забытая страница окажется открытой.
  const user = await currentUser();

  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {user ? (
          <div className="topbar">
            <b>MediaMap · панель</b>
            {LINKS.map((link) => (
              <span key={link.href}>
                {" | "}
                <Link href={link.href}>{link.label}</Link>
              </span>
            ))}
            {" | "}
            <a href={SITE}>← На сайт</a>
            {" | "}
            <span className="note">{user.name ?? user.email}</span>{" "}
            {/* Настоящий выход, а не ссылка на главную: в старой панели
                кнопка «выйти» просто уводила на сайт, оставляя сессию. */}
            <form action={signOut} style={{ display: "inline" }}>
              <button type="submit">Выйти</button>
            </form>
            <hr />
          </div>
        ) : null}

        <main>{children}</main>
      </body>
    </html>
  );
}
