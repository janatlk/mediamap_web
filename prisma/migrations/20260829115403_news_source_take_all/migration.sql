-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_news_sources" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "takeAll" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" DATETIME,
    "lastStatus" TEXT,
    "lastError" TEXT,
    "lastFound" INTEGER,
    "lastKept" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_news_sources" ("createdAt", "enabled", "feedUrl", "id", "lang", "lastError", "lastFound", "lastKept", "lastRunAt", "lastStatus", "name", "updatedAt") SELECT "createdAt", "enabled", "feedUrl", "id", "lang", "lastError", "lastFound", "lastKept", "lastRunAt", "lastStatus", "name", "updatedAt" FROM "news_sources";
DROP TABLE "news_sources";
ALTER TABLE "new_news_sources" RENAME TO "news_sources";
CREATE UNIQUE INDEX "news_sources_feedUrl_key" ON "news_sources"("feedUrl");
CREATE INDEX "news_sources_enabled_idx" ON "news_sources"("enabled");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
