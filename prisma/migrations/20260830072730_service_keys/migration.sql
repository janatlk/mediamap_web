-- CreateTable
CREATE TABLE "service_keys" (
    "service" TEXT NOT NULL PRIMARY KEY,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" DATETIME,
    "lastStatus" TEXT,
    "lastError" TEXT,
    "lastLatencyMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
