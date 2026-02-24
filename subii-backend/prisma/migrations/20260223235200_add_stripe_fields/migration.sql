-- AlterTable
ALTER TABLE "users" ADD COLUMN "cardBrand" TEXT;
ALTER TABLE "users" ADD COLUMN "cardExpMonth" INTEGER;
ALTER TABLE "users" ADD COLUMN "cardExpYear" INTEGER;
ALTER TABLE "users" ADD COLUMN "cardLast4" TEXT;
ALTER TABLE "users" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "users" ADD COLUMN "stripePaymentMethodId" TEXT;
