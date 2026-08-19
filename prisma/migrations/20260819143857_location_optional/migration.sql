-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicId" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "regionCode" TEXT,
    "city" TEXT,
    "mediaLink" TEXT,
    "screenshot" TEXT,
    "authorComment" TEXT,
    "moderatorComment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "severity" TEXT,
    "violationTypeId" INTEGER NOT NULL,
    "reviewedById" INTEGER,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reports_violationTypeId_fkey" FOREIGN KEY ("violationTypeId") REFERENCES "violation_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_reports" ("authorComment", "city", "createdAt", "id", "lat", "lng", "mediaLink", "moderatorComment", "publicId", "regionCode", "reviewedAt", "reviewedById", "screenshot", "severity", "status", "updatedAt", "violationTypeId") SELECT "authorComment", "city", "createdAt", "id", "lat", "lng", "mediaLink", "moderatorComment", "publicId", "regionCode", "reviewedAt", "reviewedById", "screenshot", "severity", "status", "updatedAt", "violationTypeId" FROM "reports";
DROP TABLE "reports";
ALTER TABLE "new_reports" RENAME TO "reports";
CREATE UNIQUE INDEX "reports_publicId_key" ON "reports"("publicId");
CREATE INDEX "reports_status_idx" ON "reports"("status");
CREATE INDEX "reports_violationTypeId_idx" ON "reports"("violationTypeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
