"use server";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { endSession, startSession, verifyPassword } from "@/lib/auth";

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

  // Одна и та же ошибка на «нет такого» и «пароль не тот»: иначе форма
  // превращается в способ узнать, какие адреса у нас заведены.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "wrong" };
  }

  await startSession(user.id);
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}
