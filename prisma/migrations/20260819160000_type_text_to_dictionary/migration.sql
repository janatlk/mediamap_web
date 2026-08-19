-- Названия и описания видов нарушений переехали в словарь сайта
-- (src/lib/i18n/violations-*.ts). В базе у вида остались только опознание
-- и порядок: половина текста в базе и половина в словаре однажды разошлись
-- бы между собой.
--
-- Связи с сообщениями не трогаем: у reports остаётся тот же violationTypeId.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_violation_types" (
    "id"   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "new_violation_types" ("id", "slug", "sort")
SELECT "id", "slug", "sort" FROM "violation_types";

DROP TABLE "violation_types";
ALTER TABLE "new_violation_types" RENAME TO "violation_types";

CREATE UNIQUE INDEX "violation_types_slug_key" ON "violation_types"("slug");

PRAGMA foreign_keys=ON;
