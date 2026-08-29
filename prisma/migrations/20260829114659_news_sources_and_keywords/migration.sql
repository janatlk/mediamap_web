-- CreateTable
CREATE TABLE "news_sources" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "lastStatus" TEXT,
    "lastError" TEXT,
    "lastFound" INTEGER,
    "lastKept" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "news_keywords" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "word" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_news" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "snippet" TEXT,
    "source" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "sourceId" INTEGER,
    "lang" TEXT,
    "matched" TEXT,
    CONSTRAINT "news_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "news_sources" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_news" ("guid", "id", "link", "publishedAt", "snippet", "source", "title") SELECT "guid", "id", "link", "publishedAt", "snippet", "source", "title" FROM "news";
DROP TABLE "news";
ALTER TABLE "new_news" RENAME TO "news";
CREATE UNIQUE INDEX "news_guid_key" ON "news"("guid");
CREATE INDEX "news_publishedAt_idx" ON "news"("publishedAt");
CREATE INDEX "news_sourceId_idx" ON "news"("sourceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "news_sources_feedUrl_key" ON "news_sources"("feedUrl");

-- CreateIndex
CREATE INDEX "news_sources_enabled_idx" ON "news_sources"("enabled");

-- CreateIndex
CREATE INDEX "news_keywords_lang_enabled_idx" ON "news_keywords"("lang", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "news_keywords_lang_word_key" ON "news_keywords"("lang", "word");
