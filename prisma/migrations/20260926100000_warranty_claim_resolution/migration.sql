-- AlterTable
ALTER TABLE "warranty_claims" ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

