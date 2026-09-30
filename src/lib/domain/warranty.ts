import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { generateBookingRef } from "@/lib/bookingRef";
import { normalizeIndianMobile } from "@/lib/phone";
import { formatIst, istDateToUtc, istLocalToUtc } from "@/lib/time";
import { ApproveClaimSchema, ClaimInputSchema, RejectClaimSchema } from "@/schema/warranty";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import { notifyWarrantyApproved, notifyWarrantyClaim, notifyWarrantyRejected } from "./notifications";
import { bookingWhere, canAccessStore, storeOnlyWhere, type AdminScope } from "@/lib/scope";
import { fail, ok, type Result } from "./result";

export type ClaimStatusValue = "PENDING" | "APPROVED" | "REJECTED";

// What a customer sees on /track for a completed booking.
export interface WarrantyStatus {
    expiresAt: string;
    daysLeft: number;
    canClaim: boolean;
    claim: { status: ClaimStatusValue; rejectReason: string | null; createdAt: string } | null;
}

interface WarrantyBookingFields {
    status: string;
    warrantyExpiresAt: Date | null;
    warrantyClaimOfId: string | null;
    claimsAgainst: { status: ClaimStatusValue; rejectReason: string | null; createdAt: Date }[];
}

const DAY = 86400000;

// A booking is covered only while its guarantee runs, and a free re-service is never itself covered again.
export function warrantyStatusOf(b: WarrantyBookingFields, now = new Date()): WarrantyStatus | null {
    if (b.status !== "COMPLETED" || !b.warrantyExpiresAt || b.warrantyClaimOfId) return null;

    const active = b.warrantyExpiresAt.getTime() > now.getTime();
    const latest = b.claimsAgainst[0] ?? null;
    // One free re-service per job. A declined claim can be raised again while the guarantee still runs.
    const blocked = b.claimsAgainst.some((c) => c.status === "PENDING" || c.status === "APPROVED");

    return {
        expiresAt: b.warrantyExpiresAt.toISOString(),
        daysLeft: active ? Math.ceil((b.warrantyExpiresAt.getTime() - now.getTime()) / DAY) : 0,
        canClaim: active && !blocked,
        claim: latest ? { status: latest.status, rejectReason: latest.rejectReason, createdAt: latest.createdAt.toISOString() } : null,
    };
}

export async function submitWarrantyClaim(raw: unknown): Promise<Result<{ claimId: string }>> {
    const normalized =
        raw && typeof raw === "object" && "mobile" in raw ? { ...raw, mobile: normalizeIndianMobile(String((raw as { mobile: unknown }).mobile ?? "")) } : raw;
    const parsed = ClaimInputSchema.safeParse(normalized);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const { bookingRef, mobile, issue } = parsed.data;

    const booking = await db.booking.findFirst({
        where: { bookingRef: bookingRef.toUpperCase(), mobile },
        include: { claimsAgainst: { orderBy: { createdAt: "desc" }, select: { status: true, rejectReason: true, createdAt: true } } },
    });
    // Same answer for "no such booking" and "not your booking" so references cannot be probed.
    if (!booking) return fail("not_found", "Booking not found");

    const status = warrantyStatusOf(booking);
    if (!status) return fail("no_guarantee", "This booking has no guarantee");
    if (!status.canClaim) {
        return fail(
            status.daysLeft === 0 ? "expired" : "already_claimed",
            status.daysLeft === 0 ? "The guarantee on this booking has ended" : "A guarantee claim is already open or was approved for this booking"
        );
    }

    const claim = await db.warrantyClaim.create({ data: { originalBookingId: booking.id, issueDescription: issue } });
    await notifyWarrantyClaim(claim.id);
    return ok({ claimId: claim.id });
}

// ---------- admin ----------

export interface ClaimItem {
    id: string;
    status: ClaimStatusValue;
    issueDescription: string;
    rejectReason: string | null;
    createdAt: string;
    resolvedAt: string | null;
    originalBookingId: string;
    bookingRef: string;
    customerName: string;
    mobile: string;
    applianceCategory: ApplianceCategoryValue;
    serviceType: string;
    town: string;
    completedAt: string | null;
    warrantyExpiresAt: string | null;
    technician: { id: string; name: string; isActive: boolean } | null;
    freeBooking: { id: string; bookingRef: string; status: string } | null;
}

export async function listWarrantyClaims(scope: AdminScope, status?: ClaimStatusValue): Promise<ClaimItem[]> {
    const rows = await db.warrantyClaim.findMany({
        where: { ...(status ? { status } : {}), originalBooking: bookingWhere(scope) },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
            originalBooking: { include: { technician: { select: { id: true, name: true, isActive: true } } } },
            createdBooking: { select: { id: true, bookingRef: true, status: true } },
        },
    });

    return rows.map((c) => ({
        id: c.id,
        status: c.status,
        issueDescription: c.issueDescription,
        rejectReason: c.rejectReason,
        createdAt: c.createdAt.toISOString(),
        resolvedAt: c.resolvedAt?.toISOString() ?? null,
        originalBookingId: c.originalBookingId,
        bookingRef: c.originalBooking.bookingRef,
        customerName: c.originalBooking.customerName,
        mobile: c.originalBooking.mobile,
        applianceCategory: c.originalBooking.applianceCategory,
        serviceType: c.originalBooking.serviceType,
        town: c.originalBooking.town,
        completedAt: c.originalBooking.completedAt?.toISOString() ?? null,
        warrantyExpiresAt: c.originalBooking.warrantyExpiresAt?.toISOString() ?? null,
        technician: c.originalBooking.technician,
        freeBooking: c.createdBooking,
    }));
}

export async function pendingClaimCount(scope: AdminScope): Promise<number> {
    return db.warrantyClaim.count({ where: { status: "PENDING", originalBooking: bookingWhere(scope) } });
}

// Approving creates the free re-service: a Rs 0 booking for the same customer, already confirmed with a technician.
export async function approveWarrantyClaim(scope: AdminScope, claimId: string, raw: unknown): Promise<Result<{ bookingRef: string }>> {
    const parsed = ApproveClaimSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const arrival = istLocalToUtc(parsed.data.arrivalAt);
    const now = Date.now();
    if (Number.isNaN(arrival.getTime()) || arrival.getTime() < now - 10 * 60000 || arrival.getTime() > now + 60 * 86400000) {
        return fail("invalid_arrival", "Choose an arrival time from now up to 60 days ahead");
    }

    const adminId = scope.adminId;
    const claim = await db.warrantyClaim.findFirst({ where: { id: claimId, originalBooking: storeOnlyWhere(scope) }, include: { originalBooking: true } });
    if (!claim) return fail("not_found", "Claim not found");
    if (claim.status !== "PENDING") return fail("resolved", "This claim has already been decided");

    const original = claim.originalBooking;
    if (!original.warrantyExpiresAt || original.warrantyExpiresAt.getTime() < now - DAY) {
        return fail("expired", "The guarantee on this booking has ended");
    }

    const technicianId = parsed.data.technicianId ?? original.technicianId;
    const technician = technicianId ? await db.technician.findUnique({ where: { id: technicianId }, select: { id: true, name: true, isActive: true, storeId: true } }) : null;
    if (!technician || !technician.isActive || !canAccessStore(scope, technician.storeId)) {
        return fail("technician_unavailable", "The original technician is not available. Choose another technician.");
    }

    const dateString = parsed.data.arrivalAt.slice(0, 10);
    const clock = arrival.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).toUpperCase();

    let bookingRef = "";
    const done = await db.$transaction(async (tx) => {
        // Only one admin can win the decision, so the free booking is never created twice.
        const decided = await tx.warrantyClaim.updateMany({ where: { id: claimId, status: "PENDING" }, data: { status: "APPROVED", resolvedById: adminId, resolvedAt: new Date() } });
        if (decided.count === 0) return false;

        for (let attempt = 0; attempt < 3; attempt++) {
            bookingRef = generateBookingRef();
            if (!(await tx.booking.findUnique({ where: { bookingRef }, select: { id: true } }))) break;
        }

        const redo = await tx.booking.create({
            data: {
                bookingRef,
                source: "ADMIN",
                status: "CONFIRMED",
                storeId: technician.storeId,
                customerName: original.customerName,
                mobile: original.mobile,
                streetAddress: original.streetAddress,
                town: original.town,
                pincode: original.pincode,
                serviceAreaId: original.serviceAreaId,
                lat: original.lat,
                lng: original.lng,
                date: istDateToUtc(dateString),
                time: clock,
                confirmedArrivalAt: arrival,
                serviceId: original.serviceId,
                applianceCategory: original.applianceCategory,
                applianceSubType: original.applianceSubType,
                serviceType: original.serviceType,
                price: 0,
                technicianId: technician.id,
                warrantyClaimOfId: original.id,
                technicianNotes: null,
                statusHistory: {
                    create: {
                        fromStatus: null,
                        toStatus: "CONFIRMED",
                        changedByType: "admin",
                        changedById: adminId,
                        note: `Free re-service under the guarantee on ${original.bookingRef}. Assigned to ${technician.name}, arrival ${formatIst(arrival)}`,
                    },
                },
            },
        });
        await tx.warrantyClaim.update({ where: { id: claimId }, data: { createdBookingId: redo.id } });
        return true;
    });
    if (!done) return fail("conflict", "This claim was just decided. Please refresh.");

    await logAudit({
        actorType: "admin",
        actorId: adminId,
        action: "warranty.approve",
        entity: "WarrantyClaim",
        entityId: claimId,
        after: { originalBooking: original.bookingRef, freeBooking: bookingRef, technicianId: technician.id, arrivalAt: arrival.toISOString() },
    });
    await notifyWarrantyApproved(claimId);
    return ok({ bookingRef });
}

export async function rejectWarrantyClaim(scope: AdminScope, claimId: string, raw: unknown): Promise<Result<null>> {
    const adminId = scope.adminId;
    const parsed = RejectClaimSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const decided = await db.warrantyClaim.updateMany({
        where: { id: claimId, status: "PENDING", originalBooking: storeOnlyWhere(scope) },
        data: { status: "REJECTED", resolvedById: adminId, resolvedAt: new Date(), rejectReason: parsed.data.reason },
    });
    if (decided.count === 0) {
        const exists = await db.warrantyClaim.findFirst({ where: { id: claimId, originalBooking: storeOnlyWhere(scope) }, select: { id: true } });
        return exists ? fail("resolved", "This claim has already been decided") : fail("not_found", "Claim not found");
    }

    await logAudit({ actorType: "admin", actorId: adminId, action: "warranty.reject", entity: "WarrantyClaim", entityId: claimId, after: { reason: parsed.data.reason } });
    await notifyWarrantyRejected(claimId);
    return ok(null);
}

