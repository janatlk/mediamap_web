import { redirect } from "next/navigation";

import { currentUser, type SessionUser } from "./auth";
import { canEditContent } from "./enums";

// Проверка доступа для служебных страниц.
//
// Вызывается на каждой странице отдельно, а не один раз в макете: макет
// легко забыть, а забытая страница окажется открытой всем.

/** Пускает любого сотрудника. Иначе уводит на вход. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Пускает только тех, кому можно менять содержимое сайта. */
export async function requireEditor(): Promise<SessionUser> {
  const user = await requireStaff();
  if (!canEditContent(user.role)) redirect("/admin");
  return user;
}
