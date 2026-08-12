import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma";

/**
 * Клиент базы.
 *
 * В разработке Next.js перезагружает модули на каждое изменение, и без
 * кэша в globalThis на каждой правке открывалось бы новое соединение,
 * пока база не откажет.
 */

const createClient = () =>
  new PrismaClient({
    adapter: new PrismaLibSql({
      url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
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
