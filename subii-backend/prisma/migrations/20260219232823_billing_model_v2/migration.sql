/*
  Warnings:

  - You are about to drop the column `activatedAt` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `nextDueDate` on the `subscriptions` table. All the data in the column will be lost.
  - Added the required column `renewalDay` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN "billingDay" INTEGER;

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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_subscriptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "providerCode" TEXT NOT NULL,
    "planId" INTEGER NOT NULL,
    "priceOverridePLN" REAL,
    "renewalDay" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_providerCode_fkey" FOREIGN KEY ("providerCode") REFERENCES "providers" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_subscriptions" ("cancelledAt", "createdAt", "id", "planId", "priceOverridePLN", "providerCode", "status", "userId") SELECT "cancelledAt", "createdAt", "id", "planId", "priceOverridePLN", "providerCode", "status", "userId" FROM "subscriptions";
DROP TABLE "subscriptions";
ALTER TABLE "new_subscriptions" RENAME TO "subscriptions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "billing_cycles_userId_period_key" ON "billing_cycles"("userId", "period");
