-- CreateTable
CREATE TABLE "sources" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT,
    "handle" TEXT,
    "host" TEXT NOT NULL,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "reason" TEXT,
    "decidedById" INTEGER,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sources_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "source_handles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'HANDLE',
    "value" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origin" TEXT NOT NULL DEFAULT 'link',
    CONSTRAINT "source_handles_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "sourceId" INTEGER,
    "headline" TEXT,
    "screenshot" TEXT,
    "moderatorComment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "aiVerdict" TEXT,
    "aiConfidence" REAL,
    "aiSummary" TEXT,
    "aiSource" TEXT,
    "aiCheckedAt" DATETIME,
    "aiTypeChecks" TEXT,
    "aiExtractedText" TEXT,
    "aiBasis" TEXT,
    "reviewVerdict" TEXT,
    "reviewConfidence" REAL,
    "reviewSummary" TEXT,
    "severity" TEXT,
    "violationTypeId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "reviewedById" INTEGER,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reports_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "reports_violationTypeId_fkey" FOREIGN KEY ("violationTypeId") REFERENCES "violation_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_reports" ("aiBasis", "aiCheckedAt", "aiConfidence", "aiExtractedText", "aiSource", "aiSummary", "aiTypeChecks", "aiVerdict", "authorComment", "authorId", "city", "createdAt", "headline", "id", "lat", "lng", "mediaLink", "moderatorComment", "publicId", "receiptToken", "regionCode", "reviewConfidence", "reviewSummary", "reviewVerdict", "reviewedAt", "reviewedById", "screenshot", "severity", "status", "updatedAt", "violationTypeId") SELECT "aiBasis", "aiCheckedAt", "aiConfidence", "aiExtractedText", "aiSource", "aiSummary", "aiTypeChecks", "aiVerdict", "authorComment", "authorId", "city", "createdAt", "headline", "id", "lat", "lng", "mediaLink", "moderatorComment", "publicId", "receiptToken", "regionCode", "reviewConfidence", "reviewSummary", "reviewVerdict", "reviewedAt", "reviewedById", "screenshot", "severity", "status", "updatedAt", "violationTypeId" FROM "reports";
DROP TABLE "reports";
ALTER TABLE "new_reports" RENAME TO "reports";
CREATE UNIQUE INDEX "reports_publicId_key" ON "reports"("publicId");
CREATE UNIQUE INDEX "reports_receiptToken_key" ON "reports"("receiptToken");
CREATE INDEX "reports_status_idx" ON "reports"("status");
CREATE INDEX "reports_violationTypeId_idx" ON "reports"("violationTypeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "sources_key_key" ON "sources"("key");

-- CreateIndex
CREATE INDEX "sources_status_idx" ON "sources"("status");

-- CreateIndex
CREATE INDEX "sources_platform_idx" ON "sources"("platform");

-- CreateIndex
CREATE INDEX "source_handles_value_idx" ON "source_handles"("value");

-- CreateIndex
CREATE UNIQUE INDEX "source_handles_sourceId_kind_value_key" ON "source_handles"("sourceId", "kind", "value");
