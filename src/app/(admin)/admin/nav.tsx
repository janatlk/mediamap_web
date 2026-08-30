"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
  Разделы панели.

  Клиентский компонент ради одного: подсветить открытый раздел. Раньше все
  пункты выглядели одинаковыми ссылками, и понять, где ты находишься, можно
  было только по заголовку страницы — а он ниже и называется иначе
  («Сообщения» в меню, «Контроль ИИ» в меню и «Контроль ИИ» в заголовке
  совпадали не везде).

  Открытый пункт не ссылка вовсе. Ссылка на страницу, где ты уже стоишь, —
  обещание перехода, которого не будет.
*/

type Item = { href: string; label: string };

export default function Nav({
  links,
  pending,
}: {
  links: Item[];
  /** Сколько сообщений ждёт проверки. Это главная работа в панели. */
  pending: number;
}) {
  const path = usePathname();

  return (
    <nav className="sections">
      {links.map((link) => {
        const here = link.href === "/admin" ? path === "/admin" : path.startsWith(link.href);

        return here ? (
          <b key={link.href} aria-current="page">
            {link.label}
            {label(link, pending)}
          </b>
        ) : (
          <Link key={link.href} href={link.href}>
            {link.label}
            {label(link, pending)}
          </Link>
        );
      })}
    </nav>
  );
}

/** Счётчик очереди — только у «Сообщений» и только когда очередь не пуста. */
function label(link: Item, pending: number): string {
  return link.href === "/admin" && pending > 0 ? ` (${pending})` : "";
}
