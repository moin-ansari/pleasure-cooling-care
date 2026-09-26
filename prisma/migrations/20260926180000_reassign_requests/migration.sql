-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "reassignReason" TEXT,
ADD COLUMN     "reassignRequestedAt" TIMESTAMP(3);

