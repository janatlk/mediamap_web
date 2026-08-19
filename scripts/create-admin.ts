/**
 * Заводит сотрудника с доступом в панель.
 *
 * Пароль берётся из переменной окружения и нигде не сохраняется в открытом
 * виде — в базу уходит только хеш. В коде пароля нет и быть не должно:
 * репозиторий публичный.
 *
 * Запуск (PowerShell):
 *   $env:ADMIN_EMAIL="you@example.kg"; $env:ADMIN_PASSWORD="…"; npm run admin:create
 *
 * Запуск (bash):
 *   ADMIN_EMAIL=you@example.kg ADMIN_PASSWORD='…' npm run admin:create
 */

import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { ROLE } from "../src/lib/enums";

const MIN_PASSWORD = 12;

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME ?? null;

  if (!email || !password) {
    throw new Error(
      "Нужны переменные ADMIN_EMAIL и ADMIN_PASSWORD. Пароль в аргументах " +
        "командной строки передавать не стоит — он останется в истории.",
    );
  }

  if (password.length < MIN_PASSWORD) {
    throw new Error(`Пароль короче ${MIN_PASSWORD} символов.`);
  }

  const passwordHash = await hashPassword(password);

  // Повторный запуск меняет пароль, а не падает: это же и способ сбросить
  // забытый пароль, пока нет отдельного восстановления.
  const user = await db.user.upsert({
    where: { email },
    create: { email, name, passwordHash, role: ROLE.ADMIN },
    update: { passwordHash },
  });

  console.log(`Готово: ${user.email}, роль ${user.role}`);
  console.log("Вход: /admin/login");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
