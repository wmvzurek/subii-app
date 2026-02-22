--20260222000002_add_next_renewal_date

ALTER TABLE "subscriptions" ADD COLUMN "nextRenewalDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "subscriptions" DROP COLUMN "renewalDay";