-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_site_texts" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "valueRu" TEXT NOT NULL,
    "valueKy" TEXT NOT NULL,
    "valueEn" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_site_texts" ("category", "key", "updatedAt", "valueKy", "valueRu") SELECT "category", "key", "updatedAt", "valueKy", "valueRu" FROM "site_texts";
DROP TABLE "site_texts";
ALTER TABLE "new_site_texts" RENAME TO "site_texts";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
