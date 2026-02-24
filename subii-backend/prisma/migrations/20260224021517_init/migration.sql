-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "phone" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "billingDay" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "cardExpMonth" INTEGER,
    "cardExpYear" INTEGER
);

-- CreateTable
CREATE TABLE "providers" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "logoUrl" TEXT
);

-- CreateTable
CREATE TABLE "plans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "providerCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'PL',
    "planName" TEXT NOT NULL,
    "pricePLN" REAL NOT NULL,
    "cycle" TEXT NOT NULL DEFAULT 'monthly',
    "screens" INTEGER NOT NULL,
    "uhd" BOOLEAN NOT NULL,
    "ads" BOOLEAN NOT NULL,
    "lastVerifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plans_providerCode_fkey" FOREIGN KEY ("providerCode") REFERENCES "providers" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "providerCode" TEXT NOT NULL,
    "planId" INTEGER NOT NULL,
    "pendingPlanId" INTEGER,
    "priceOverridePLN" REAL,
    "nextRenewalDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "activeUntil" DATETIME,
    "pendingChargePLN" REAL,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_providerCode_fkey" FOREIGN KEY ("providerCode") REFERENCES "providers" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_pendingPlanId_fkey" FOREIGN KEY ("pendingPlanId") REFERENCES "plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "titles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tmdbId" INTEGER NOT NULL,
    "imdbId" TEXT,
    "titlePL" TEXT NOT NULL,
    "titleOriginal" TEXT NOT NULL,
    "year" INTEGER,
    "runtime" INTEGER,
    "mediaType" TEXT,
    "plot" TEXT,
    "posterUrl" TEXT,
    "genres" TEXT NOT NULL,
    "keywords" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "availability" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titleId" INTEGER NOT NULL,
    "providerCode" TEXT NOT NULL,
    "offerType" TEXT NOT NULL,
    "pricePLN" REAL,
    "quality" TEXT,
    "link" TEXT,
    "region" TEXT NOT NULL DEFAULT 'PL',
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "availability_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "titles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_titles" (
    "userId" INTEGER NOT NULL,
    "titleId" INTEGER NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "titleId"),
    CONSTRAINT "user_titles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_titles_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "titles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "billing_cycles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "billingDate" DATETIME NOT NULL,
    "totalPLN" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_cycles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "billing_cycle_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "billingCycleId" TEXT NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "providerCode" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "pricePLN" REAL NOT NULL,
    "periodFrom" DATETIME NOT NULL,
    "periodTo" DATETIME NOT NULL,
    "creditApplied" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "billing_cycle_items_billingCycleId_fkey" FOREIGN KEY ("billingCycleId") REFERENCES "billing_cycles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "billing_cycle_items_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "periodFrom" DATETIME NOT NULL,
    "periodTo" DATETIME NOT NULL,
    "pdfBase64" TEXT NOT NULL,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_episodes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "tmdbSeriesId" INTEGER NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "durationMinutes" INTEGER,
    "watchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seriesTitle" TEXT,
    CONSTRAINT "user_episodes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "plans_providerCode_planName_key" ON "plans"("providerCode", "planName");

-- CreateIndex
CREATE UNIQUE INDEX "titles_tmdbId_key" ON "titles"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_cycles_userId_period_key" ON "billing_cycles"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "payment_reports_userId_period_key" ON "payment_reports"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "user_episodes_userId_tmdbSeriesId_seasonNumber_episodeNumber_key" ON "user_episodes"("userId", "tmdbSeriesId", "seasonNumber", "episodeNumber");
