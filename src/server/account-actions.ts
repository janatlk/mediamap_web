"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hashPassword, startSession, verifyPassword, endSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE } from "@/lib/enums";
import { ACCOUNT_ERRORS, loginSchema, registerSchema } from "@/lib/account-schema";

// Аккаунт заявителя. Дело добровольное: анонимная подача остаётся основным
// путём, аккаунт лишь даёт историю сообщений на всех устройствах.

export type AccountState = { error?: string; email?: string };

const firstError = (issues: { message: string }[]) =>
  issues[0]?.message ?? ACCOUNT_ERRORS.wrong;

export async function register(
  _previous: AccountState,
  form: FormData,
): Promise<AccountState> {
  const parsed = registerSchema.safeParse({
    email: form.get("email") ?? "",
    password: form.get("password") ?? "",
    name: form.get("name") ?? "",
  });

  if (!parsed.success) {
    return {
      error: firstError(parsed.error.issues),
      email: String(form.get("email") ?? ""),
    };
  }

  const { email, password, name } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: ACCOUNT_ERRORS.taken, email };

  const user = await db.user.create({
    data: {
      email,
      name: name || null,
      passwordHash: await hashPassword(password),
      // Роль задаётся здесь, а не приходит из формы: в старом проекте её
      // брали из тела запроса, и администратором становился кто хотел.
      role: ROLE.REPORTER,
    },
  });

  await startSession(user.id);
  redirect("/ru/account");
}

export async function signInAccount(
  _previous: AccountState,
  form: FormData,
): Promise<AccountState> {
  const parsed = loginSchema.safeParse({
    email: form.get("email") ?? "",
    password: form.get("password") ?? "",
  });

  const email = String(form.get("email") ?? "");
  if (!parsed.success) return { error: ACCOUNT_ERRORS.wrong, email };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // Один ответ на все случаи: нет такого адреса, пароль не тот, вход только
  // через Google. Иначе форма подсказывает, какие адреса у нас заведены.
  if (
    !user ||
    !user.passwordHash ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  ) {
    return { error: ACCOUNT_ERRORS.wrong, email };
  }

  await startSession(user.id);
  redirect("/ru/account");
}

/**
 * Включает или выключает письма о решении по своим заявкам.
 *
 * Значение приходит галкой: невыбранная галка в форме не отправляется вовсе,
 * поэтому смотрим на присутствие поля, а не на его содержимое.
 */
export async function setEmailNotifications(form: FormData): Promise<void> {
  const { currentUser } = await import("@/lib/auth");
  const user = await currentUser();
  if (!user) return;

  await db.user.update({
    where: { id: user.id },
    data: { notifyByEmail: form.get("notify") !== null },
  });

  revalidatePath("/[lang]/account", "page");
}

export async function signOutAccount(): Promise<void> {
  await endSession();
  redirect("/ru");
}

/**
 * Привязывает к аккаунту сообщения, поданные анонимно с этого браузера.
 *
 * Вызывается после входа со списком ключей из localStorage. Берём только
 * те, что ещё ничьи: чужое сообщение по подобранному ключу присвоить
 * нельзя, а свой ключ знает только тот, кто подавал.
 */
export async function adoptReports(tokens: string[]): Promise<number> {
  const { currentUser } = await import("@/lib/auth");
  const user = await currentUser();
  if (!user) return 0;

  const clean = tokens.filter((token) => typeof token === "string" && token).slice(0, 50);
  if (clean.length === 0) return 0;

  const result = await db.report.updateMany({
    where: { receiptToken: { in: clean }, authorId: null },
    data: { authorId: user.id },
  });

  return result.count;
}
