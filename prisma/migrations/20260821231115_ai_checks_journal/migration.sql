-- CreateTable
CREATE TABLE "ai_checks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportId" INTEGER,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "verdict" TEXT,
    "confidence" REAL,
    "sublabel" TEXT,
    "act" TEXT,
    "claim" TEXT,
    "factVerdict" TEXT,
    "sources" TEXT,
    "chosenType" TEXT,
    "latencyMs" INTEGER,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_checks_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ai_checks_createdAt_idx" ON "ai_checks"("createdAt");

-- CreateIndex
CREATE INDEX "ai_checks_source_idx" ON "ai_checks"("source");

-- CreateIndex
CREATE INDEX "ai_checks_ok_idx" ON "ai_checks"("ok");
