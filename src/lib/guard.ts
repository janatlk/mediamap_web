import { redirect } from "next/navigation";

import { currentUser, type SessionUser } from "./auth";
import { canEditContent, isStaff } from "./enums";

// Проверка доступа для служебных страниц.
//
// Вызывается на каждой странице отдельно, а не один раз в макете: макет
// легко забыть, а забытая страница окажется открытой всем.

/**
 * Пускает только сотрудника.
 *
 * Проверяем роль, а не просто наличие сессии: с появлением аккаунтов для
 * заявителей сессия есть у кого угодно, и одного её наличия мало.
 */
export async function requireStaff(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  if (!isStaff(user.role)) redirect("/admin/login");
  return user;
}

/** Пускает только тех, кому можно менять содержимое сайта. */
export async function requireEditor(): Promise<SessionUser> {
  const user = await requireStaff();
  if (!canEditContent(user.role)) redirect("/admin");
  return user;
}
