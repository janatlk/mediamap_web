import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import { db } from "./db";
import type { Role } from "./enums";

// Вход и сессии.
//
// Сессия лежит в базе, а не в самоподписанном токене: так доступ можно
// отозвать, не заставляя человека менять пароль. В старом проекте токен
// хранился прямо в строке пользователя и не истекал никогда.

const COOKIE = "mm_session";

/*
  Два разных срока, и это не путаница.

  В куке лежит только ключ сессии, и живёт она долго: её задача — не
  потеряться, пока человек не закрыл браузер на полгода. Настоящий срок
  хранится в базе, там его можно отозвать и там же он продлевается.

  Срок скользящий: кто заходит в панель каждый день, не вводит пароль
  вообще, а брошенная сессия умирает через месяц сама. Раньше было
  четырнадцать дней без продления, и сотрудники вводили пароль заново
  каждые две недели — просто потому, что прошло две недели.
*/
const COOKIE_DAYS = 180;
const DAYS = 30;
const ROUNDS = 12;

const day = 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  /** Писать ли ему о решении по его заявкам. */
  notifyByEmail: boolean;
};

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);

export const verifyPassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash);

/** Заводит сессию и кладёт её ключ в куку. */
export async function startSession(userId: number): Promise<void> {
  const expiresAt = new Date(Date.now() + DAYS * day);
  const session = await db.session.create({ data: { userId, expiresAt } });

  const jar = await cookies();
  jar.set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + COOKIE_DAYS * day),
  });
}

/** Ключ текущей сессии. Нужен, чтобы закрыть все прочие и не выгнать себя. */
export async function currentSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

/** Закрывает текущую сессию: и в базе, и в браузере. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;

  if (id) {
    // Строки может уже не быть — тогда и удалять нечего.
    await db.session.deleteMany({ where: { id } });
  }
  jar.delete(COOKIE);
}

/**
 * Кто сейчас вошёл. null, если никто.
 *
 * Просроченные сессии удаляем на месте: отдельная чистка по расписанию
 * ради этого не нужна, а мусор в таблице копиться не будет.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;

  const session = await db.session.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await db.session.deleteMany({ where: { id } });
    return null;
  }

  /*
    Продлеваем, когда прошла половина срока. Не на каждый запрос: иначе
    открытая страница панели писала бы в базу при каждом обновлении списка.

    Пишем только в базу, куку не трогаем: куку из серверного компонента
    менять нельзя, а она и так выдана надолго — срок держит база.
  */
  if (session.expiresAt.getTime() - Date.now() < (DAYS * day) / 2) {
    await db.session.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() + DAYS * day) },
    });
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as Role,
    notifyByEmail: session.user.notifyByEmail,
  };
}
