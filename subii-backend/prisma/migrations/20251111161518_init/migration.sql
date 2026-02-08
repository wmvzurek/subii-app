-- CreateTable
CREATE TABLE "Plan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "providerCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'PL',
    "planName" TEXT NOT NULL,
    "pricePLN" REAL NOT NULL,
    "cycle" TEXT NOT NULL DEFAULT 'monthly',
    "screens" INTEGER NOT NULL,
    "uhd" BOOLEAN NOT NULL,
    "ads" BOOLEAN NOT NULL,
    "lastVerifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "period" TEXT NOT NULL,
    "amountPLN" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PaymentItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "paymentId" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "pricePLN" REAL NOT NULL,
    CONSTRAINT "PaymentItem_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "watchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_providerCode_planName_key" ON "Plan"("providerCode", "planName");
