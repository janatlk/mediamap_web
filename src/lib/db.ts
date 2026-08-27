import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma";

// Кэш в globalThis нужен для дева: Next перезагружает модули на каждую
// правку, и без него соединения копятся, пока база не ляжет.

/*
  Адрес базы решает и то, где она лежит.

  file: — файл рядом с проектом, так работает своя машина. libsql: — база
  у Turso по сети, и это единственный способ жить на Vercel: файловой
  системы между запусками там нет, и файл базы исчезает вместе с ней.

  Токен нужен только удалённой базе. Отдельной переменной, а не в адресе:
  адрес попадает в сообщения об ошибках и в журналы, и складывать в него
  ключ доступа значит однажды прочитать его в чужом логе.
*/
const createClient = () =>
  new PrismaClient({
    adapter: new PrismaLibSql({
      url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
