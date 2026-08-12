-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MODERATOR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "violation_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameKy" TEXT NOT NULL,
    "descRu" TEXT NOT NULL,
    "descKy" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicId" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "regionCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "news" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "snippet" TEXT,
    "source" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "site_texts" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "valueRu" TEXT NOT NULL,
    "valueKy" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "violation_types_slug_key" ON "violation_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "reports_publicId_key" ON "reports"("publicId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_regionCode_idx" ON "reports"("regionCode");

-- CreateIndex
CREATE INDEX "reports_violationTypeId_idx" ON "reports"("violationTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "news_guid_key" ON "news"("guid");

-- CreateIndex
CREATE INDEX "news_publishedAt_idx" ON "news"("publishedAt");
