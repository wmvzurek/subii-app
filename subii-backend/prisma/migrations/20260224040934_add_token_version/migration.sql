-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "phone" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "billingDay" INTEGER,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "cardExpMonth" INTEGER,
    "cardExpYear" INTEGER
);
INSERT INTO "new_users" ("billingDay", "cardBrand", "cardExpMonth", "cardExpYear", "cardLast4", "createdAt", "dateOfBirth", "email", "emailVerified", "firstName", "id", "lastName", "passwordHash", "phone", "stripeCustomerId", "stripePaymentMethodId", "updatedAt") SELECT "billingDay", "cardBrand", "cardExpMonth", "cardExpYear", "cardLast4", "createdAt", "dateOfBirth", "email", "emailVerified", "firstName", "id", "lastName", "passwordHash", "phone", "stripeCustomerId", "stripePaymentMethodId", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
