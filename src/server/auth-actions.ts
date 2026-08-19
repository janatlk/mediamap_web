"use server";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { endSession, startSession, verifyPassword } from "@/lib/auth";
import { isStaff } from "@/lib/enums";

// Вход и выход сотрудников.

export type LoginState = { error?: string };

export async function signIn(
  _previous: LoginState,
  form: FormData,
): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!email || !password) return { error: "empty" };

  const user = await db.user.findUnique({ where: { email } });

  // Пароля может не быть вовсе: человек заводил вход через Google или
  // Facebook. Ответ всё равно один и тот же — иначе форма превращается в
  // способ узнать, какие адреса у нас заведены и как именно они входят.
  if (
    !user ||
    !user.passwordHash ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
    return { error: "wrong" };
  }

  // В панель по этой форме проходят только сотрудники.
  if (!isStaff(user.role)) return { error: "wrong" };

  await startSession(user.id);
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}
