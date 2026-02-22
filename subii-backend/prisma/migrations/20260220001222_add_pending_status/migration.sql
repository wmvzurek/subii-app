--20260220001222_add_pending_status
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
    "renewalDay" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "activeUntil" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_providerCode_fkey" FOREIGN KEY ("providerCode") REFERENCES "providers" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_pendingPlanId_fkey" FOREIGN KEY ("pendingPlanId") REFERENCES "plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_subscriptions" ("cancelledAt", "createdAt", "id", "planId", "priceOverridePLN", "providerCode", "renewalDay", "status", "userId") SELECT "cancelledAt", "createdAt", "id", "planId", "priceOverridePLN", "providerCode", "renewalDay", "status", "userId" FROM "subscriptions";
DROP TABLE "subscriptions";
ALTER TABLE "new_subscriptions" RENAME TO "subscriptions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
