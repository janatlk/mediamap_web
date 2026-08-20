-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicId" TEXT NOT NULL,
    "receiptToken" TEXT,
    "lat" REAL,
    "lng" REAL,
    "regionCode" TEXT,
    "city" TEXT,
    "mediaLink" TEXT,
    "authorComment" TEXT,
    "screenshot" TEXT,
    "moderatorComment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "aiVerdict" TEXT,
    "aiConfidence" REAL,
    "aiSummary" TEXT,
    "aiSource" TEXT,
    "aiCheckedAt" DATETIME,
    "severity" TEXT,
    "violationTypeId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "reviewedById" INTEGER,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reports_violationTypeId_fkey" FOREIGN KEY ("violationTypeId") REFERENCES "violation_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_reports" ("aiCheckedAt", "aiConfidence", "aiSource", "aiSummary", "aiVerdict", "authorComment", "authorId", "city", "createdAt", "id", "lat", "lng", "mediaLink", "moderatorComment", "publicId", "receiptToken", "regionCode", "reviewedAt", "reviewedById", "screenshot", "severity", "status", "updatedAt", "violationTypeId") SELECT "aiCheckedAt", "aiConfidence", "aiSource", "aiSummary", "aiVerdict", "authorComment", "authorId", "city", "createdAt", "id", "lat", "lng", "mediaLink", "moderatorComment", "publicId", "receiptToken", "regionCode", "reviewedAt", "reviewedById", "screenshot", "severity", "status", "updatedAt", "violationTypeId" FROM "reports";
DROP TABLE "reports";
ALTER TABLE "new_reports" RENAME TO "reports";
CREATE UNIQUE INDEX "reports_publicId_key" ON "reports"("publicId");
CREATE UNIQUE INDEX "reports_receiptToken_key" ON "reports"("receiptToken");
CREATE INDEX "reports_status_idx" ON "reports"("status");
CREATE INDEX "reports_violationTypeId_idx" ON "reports"("violationTypeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "attachments_reportId_idx" ON "attachments"("reportId");
