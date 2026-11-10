-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "amountPaidMinor" INTEGER NOT NULL DEFAULT 0;

-- Backfill: invoices already marked PAID were paid in full.
UPDATE "Invoice" SET "amountPaidMinor" = "totalMinor" WHERE "status" = 'PAID';
