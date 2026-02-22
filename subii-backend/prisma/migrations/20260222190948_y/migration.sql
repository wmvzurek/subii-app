/*
  Warnings:

  - You are about to drop the `wallets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "wallets_userId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "wallets";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_subscriptions" (
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
INSERT INTO "new_subscriptions" ("activeUntil", "cancelledAt", "createdAt", "id", "nextRenewalDate", "pendingChargePLN", "pendingPlanId", "planId", "priceOverridePLN", "providerCode", "status", "userId") SELECT "activeUntil", "cancelledAt", "createdAt", "id", "nextRenewalDate", "pendingChargePLN", "pendingPlanId", "planId", "priceOverridePLN", "providerCode", "status", "userId" FROM "subscriptions";
DROP TABLE "subscriptions";
ALTER TABLE "new_subscriptions" RENAME TO "subscriptions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
