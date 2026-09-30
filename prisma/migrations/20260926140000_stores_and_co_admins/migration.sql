-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'CO_ADMIN');

-- CreateEnum
CREATE TYPE "StoreLedgerType" AS ENUM ('OWNER_SHARE_OWED', 'STORE_PAYMENT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "technicianRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "ownerRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "flatAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adminAlertPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_ledger_entries" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "StoreLedgerType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- The owner's own store. Everything that exists today belongs to it. Technicians pay 20% of the service charge,
-- all of which goes to the owner because there is no co-admin.
INSERT INTO "stores" ("id", "name", "isMain", "technicianRatePercent", "ownerRatePercent", "flatAmount", "adminAlertPhone")
VALUES ('store_main', 'Main store', true, 20, 20, 0, (SELECT "adminAlertPhone" FROM "settings" WHERE "id" = 1));

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN "phone" TEXT,
ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'OWNER',
ADD COLUMN "storeId" TEXT;

ALTER TABLE "bookings" ADD COLUMN "ownerRateApplied" DECIMAL(5,2), ADD COLUMN "storeId" TEXT;
UPDATE "bookings" SET "storeId" = 'store_main';
ALTER TABLE "bookings" ALTER COLUMN "storeId" SET NOT NULL;

ALTER TABLE "service_areas" ADD COLUMN "storeId" TEXT;
UPDATE "service_areas" SET "storeId" = 'store_main';
ALTER TABLE "service_areas" ALTER COLUMN "storeId" SET NOT NULL;

ALTER TABLE "technicians" ADD COLUMN "storeId" TEXT;
UPDATE "technicians" SET "storeId" = 'store_main';
ALTER TABLE "technicians" ALTER COLUMN "storeId" SET NOT NULL;

ALTER TABLE "ledger_entries" ADD COLUMN "storeId" TEXT;
UPDATE "ledger_entries" SET "storeId" = 'store_main';
ALTER TABLE "ledger_entries" ALTER COLUMN "storeId" SET NOT NULL;

ALTER TABLE "expenses" ADD COLUMN "storeId" TEXT;

ALTER TABLE "notification_logs" ADD COLUMN "storeId" TEXT;
UPDATE "notification_logs" SET "storeId" = 'store_main' WHERE "bookingId" IS NOT NULL;

-- The commission terms and the alert number now belong to each store.
ALTER TABLE "settings" DROP COLUMN "adminAlertPhone",
DROP COLUMN "commissionFlatAmount",
DROP COLUMN "commissionRatePercent";

-- CreateIndex
CREATE UNIQUE INDEX "stores_name_key" ON "stores"("name");

-- CreateIndex
CREATE INDEX "store_ledger_entries_storeId_idx" ON "store_ledger_entries"("storeId");

-- CreateIndex
CREATE INDEX "bookings_storeId_idx" ON "bookings"("storeId");

-- CreateIndex
CREATE INDEX "ledger_entries_storeId_idx" ON "ledger_entries"("storeId");

-- CreateIndex
CREATE INDEX "notification_logs_storeId_idx" ON "notification_logs"("storeId");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_ledger_entries" ADD CONSTRAINT "store_ledger_entries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
