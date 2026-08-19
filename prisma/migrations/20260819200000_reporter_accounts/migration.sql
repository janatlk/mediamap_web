-- Аккаунты для заявителей. Дело добровольное: анонимная подача остаётся
-- основным путём, аккаунт лишь даёт историю на всех устройствах.
--
-- passwordHash становится необязательным: у вошедших через Google или
-- Facebook пароля нет. Роль по умолчанию — REPORTER, чтобы регистрация не
-- открывала дорогу в панель.

CREATE TABLE "accounts" (
    "id"         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider"   TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "userId"     INTEGER NOT NULL,
    "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "accounts_provider_externalId_key" ON "accounts"("provider", "externalId");
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

ALTER TABLE "reports" ADD COLUMN "authorId" INTEGER REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX "reports_authorId_idx" ON "reports"("authorId");

-- Пересоздаём users: SQLite не умеет снимать NOT NULL и менять умолчание.
-- Существующим сотрудникам роль сохраняем как есть.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_users" (
    "id"           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email"        TEXT NOT NULL,
    "name"         TEXT,
    "passwordHash" TEXT,
    "role"         TEXT NOT NULL DEFAULT 'REPORTER',
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    DATETIME NOT NULL
);

INSERT INTO "new_users" ("id","email","name","passwordHash","role","createdAt","updatedAt")
SELECT "id","email","name","passwordHash","role","createdAt","updatedAt" FROM "users";

DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

PRAGMA foreign_keys=ON;
