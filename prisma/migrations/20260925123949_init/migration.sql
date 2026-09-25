-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ApplianceCategory" AS ENUM ('AC', 'REFRIGERATOR', 'WASHING_MACHINE', 'GEYSER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('NEW', 'CONFIRMED', 'ARRIVING', 'WORKING', 'DELAYED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEB', 'CHATBOT', 'VOICE', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "Rank" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('COMMISSION_OWED', 'OFFICE_PAYMENT', 'PAYOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('EXPENSE', 'AD_SPEND');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_areas" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "applianceCategory" "ApplianceCategory" NOT NULL,
    "applianceSubType" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "image" TEXT,
    "desc" TEXT[],
    "warrantyDurationDays" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fatherName" TEXT,
    "photo" TEXT,
    "phone" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "address" TEXT,
    "age" INTEGER,
    "gender" "Gender",
    "experienceYears" INTEGER,
    "specializations" "ApplianceCategory"[],
    "accountHolderName" TEXT,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "idImageUrl" TEXT,
    "rank" "Rank" NOT NULL DEFAULT 'BRONZE',
    "jobsCompletedCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "source" "BookingSource" NOT NULL DEFAULT 'WEB',
    "status" "BookingStatus" NOT NULL DEFAULT 'NEW',
    "idempotencyKey" TEXT,
    "customerName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "serviceAreaId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "confirmedArrivalAt" TIMESTAMP(3),
    "etaAt" TIMESTAMP(3),
    "serviceId" TEXT,
    "applianceCategory" "ApplianceCategory" NOT NULL,
    "applianceSubType" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "laborAmount" INTEGER NOT NULL DEFAULT 0,
    "partsAmount" INTEGER NOT NULL DEFAULT 0,
    "amountCollected" INTEGER,
    "technicianId" TEXT,
    "warrantyClaimOfId" TEXT,
    "warrantyExpiresAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "technicianNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "clickId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "changedByType" TEXT NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_claims" (
    "id" TEXT NOT NULL,
    "originalBookingId" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "createdBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warranty_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "LedgerType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "type" "ExpenseType" NOT NULL DEFAULT 'EXPENSE',
    "technicianId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_unavailability" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "technician_unavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_phones" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "channel" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "providerResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "commissionRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "commissionFlatAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "silverMinJobs" INTEGER NOT NULL DEFAULT 25,
    "silverMinRating" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "goldMinJobs" INTEGER NOT NULL DEFAULT 75,
    "goldMinRating" DOUBLE PRECISION NOT NULL DEFAULT 4.4,
    "diamondMinJobs" INTEGER NOT NULL DEFAULT 150,
    "diamondMinRating" DOUBLE PRECISION NOT NULL DEFAULT 4.7,
    "cancelBlockedFrom" "BookingStatus" NOT NULL DEFAULT 'ARRIVING',
    "adminAlertPhone" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ServiceAreaToTechnician" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ServiceAreaToTechnician_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "service_areas_state_district_key" ON "service_areas"("state", "district");

-- CreateIndex
CREATE UNIQUE INDEX "services_applianceCategory_applianceSubType_serviceType_key" ON "services"("applianceCategory", "applianceSubType", "serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_workEmail_key" ON "technicians"("workEmail");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingRef_key" ON "bookings"("bookingRef");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_idempotencyKey_key" ON "bookings"("idempotencyKey");

-- CreateIndex
CREATE INDEX "bookings_mobile_idx" ON "bookings"("mobile");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_technicianId_idx" ON "bookings"("technicianId");

-- CreateIndex
CREATE INDEX "bookings_createdAt_idx" ON "bookings"("createdAt");

-- CreateIndex
CREATE INDEX "booking_status_history_bookingId_idx" ON "booking_status_history"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- CreateIndex
CREATE INDEX "reviews_technicianId_idx" ON "reviews"("technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "warranty_claims_createdBookingId_key" ON "warranty_claims"("createdBookingId");

-- CreateIndex
CREATE INDEX "warranty_claims_originalBookingId_idx" ON "warranty_claims"("originalBookingId");

-- CreateIndex
CREATE INDEX "ledger_entries_technicianId_idx" ON "ledger_entries"("technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "technician_unavailability_technicianId_date_key" ON "technician_unavailability"("technicianId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_phones_mobile_key" ON "blocked_phones"("mobile");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "_ServiceAreaToTechnician_B_index" ON "_ServiceAreaToTechnician"("B");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES "service_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_warrantyClaimOfId_fkey" FOREIGN KEY ("warrantyClaimOfId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_originalBookingId_fkey" FOREIGN KEY ("originalBookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_createdBookingId_fkey" FOREIGN KEY ("createdBookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_unavailability" ADD CONSTRAINT "technician_unavailability_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceAreaToTechnician" ADD CONSTRAINT "_ServiceAreaToTechnician_A_fkey" FOREIGN KEY ("A") REFERENCES "service_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceAreaToTechnician" ADD CONSTRAINT "_ServiceAreaToTechnician_B_fkey" FOREIGN KEY ("B") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

