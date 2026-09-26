import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateBookingRef } from "@/lib/bookingRef";
import { normalizeIndianMobile } from "@/lib/phone";
import { addDaysToDateString, istDateString, istDateToUtc, istMinutesOfDay, slotToMinutes } from "@/lib/time";
import { BookingInputSchema, CancelInputSchema, TrackInputSchema } from "@/schema/booking";
import { MAX_BOOKING_DAYS_AHEAD, MIN_LEAD_MINUTES, isCancellableByCustomer, type BookingStatusValue } from "@/constants/booking";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import { canReviewBooking, type ReviewState } from "./reviews";
import { warrantyStatusOf, type WarrantyStatus } from "./warranty";
import { checkCoverage } from "./serviceAreas";
import { notifyBookingReceived, notifyCancelled } from "./notifications";
import { fail, ok, type Result } from "./result";

type BookingSource = "WEB" | "CHATBOT" | "VOICE" | "ADMIN";

export interface TrackedBooking {
    bookingRef: string;
    status: BookingStatusValue;
    applianceCategory: ApplianceCategoryValue;
    applianceSubType: string;
    serviceType: string;
    district: string;
    date: string;
    time: string;
    price: number;
    createdAt: string;
    confirmedArrivalAt: string | null;
    technicianFirstName: string | null;
    canCancel: boolean;
    isWarrantyRedo: boolean;
    canReview: boolean;
    review: ReviewState | null;
    warranty: WarrantyStatus | null;
}

function withNormalizedMobile(raw: unknown): unknown {
    if (raw && typeof raw === "object" && "mobile" in raw) {
        return { ...raw, mobile: normalizeIndianMobile(String((raw as { mobile: unknown }).mobile ?? "")) };
    }
    return raw;
}

async function getCancelCutoff(): Promise<BookingStatusValue> {
    const settings = await db.settings.findUnique({ where: { id: 1 }, select: { cancelBlockedFrom: true } });
    return settings?.cancelBlockedFrom ?? "ARRIVING";
}

export async function createBooking(
    raw: unknown,
    options: { source?: BookingSource; actor?: { type: "admin"; id: string } } = {}
): Promise<Result<{ bookingRef: string; price: number }>> {
    const parsed = BookingInputSchema.safeParse(withNormalizedMobile(raw));
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const input = parsed.data;

    const today = istDateString();
    if (input.date < today || input.date > addDaysToDateString(today, MAX_BOOKING_DAYS_AHEAD)) {
        return fail("invalid_date", `Choose a date within the next ${MAX_BOOKING_DAYS_AHEAD} days`);
    }
    if (input.date === today && slotToMinutes(input.time) < istMinutesOfDay() + MIN_LEAD_MINUTES) {
        return fail("invalid_time", "That time has passed. Choose a later slot or another day.");
    }

    if (await db.blockedPhone.findUnique({ where: { mobile: input.mobile } })) {
        return fail("blocked", "Unable to book with this number. Please contact us.");
    }

    if (input.idempotencyKey) {
        const existing = await db.booking.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing && existing.mobile === input.mobile) {
            return ok({ bookingRef: existing.bookingRef, price: existing.price });
        }
    }

    const service = await db.service.findFirst({ where: { id: input.serviceId, isActive: true } });
    if (!service) return fail("service_unavailable", "Selected service is not available");

    const area = await checkCoverage(input.serviceAreaId);
    if (!area) return fail("out_of_area", "Sorry, we don't serve this area yet");

    const data = {
        source: options.source ?? "WEB",
        status: "NEW" as const,
        // The store that serves this city earns from the booking.
        storeId: area.storeId,
        idempotencyKey: input.idempotencyKey,
        customerName: input.customerName,
        mobile: input.mobile,
        streetAddress: input.streetAddress,
        town: input.town,
        pincode: input.pincode,
        serviceAreaId: area.id,
        lat: input.lat,
        lng: input.lng,
        date: istDateToUtc(input.date),
        time: input.time,
        serviceId: service.id,
        applianceCategory: service.applianceCategory,
        applianceSubType: service.applianceSubType,
        serviceType: service.serviceType,
        price: service.price,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        clickId: input.clickId,
        statusHistory: { create: { toStatus: "NEW" as const, changedByType: options.actor?.type ?? "customer", changedById: options.actor?.id ?? null, note: options.actor ? "Booked by phone" : null } },
    };

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const booking = await db.booking.create({ data: { ...data, bookingRef: generateBookingRef() } });
            await notifyBookingReceived(booking.id);
            return ok({ bookingRef: booking.bookingRef, price: booking.price });
        } catch (error) {
            const collision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
            if (!collision || attempt === 2) throw error;
        }
    }
    return fail("unknown", "Could not create the booking");
}

// Deliberately returns limited fields: no street address and no phone number.
export async function trackBookingsByPhone(raw: unknown): Promise<Result<TrackedBooking[]>> {
    const parsed = TrackInputSchema.safeParse(withNormalizedMobile(raw));
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const [bookings, cutoff] = await Promise.all([
        db.booking.findMany({
            where: { mobile: parsed.data.mobile },
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
                serviceArea: { select: { district: true } },
                technician: { select: { name: true } },
                claimsAgainst: { orderBy: { createdAt: "desc" }, select: { status: true, rejectReason: true, createdAt: true } },
                review: { select: { rating: true, comment: true } },
            },
        }),
        getCancelCutoff(),
    ]);

    return ok(
        bookings.map((b) => ({
            bookingRef: b.bookingRef,
            status: b.status,
            applianceCategory: b.applianceCategory,
            applianceSubType: b.applianceSubType,
            serviceType: b.serviceType,
            district: b.serviceArea.district,
            date: istDateString(b.date),
            time: b.time,
            price: b.price,
            createdAt: b.createdAt.toISOString(),
            confirmedArrivalAt: b.confirmedArrivalAt ? b.confirmedArrivalAt.toISOString() : null,
            technicianFirstName: b.technician ? b.technician.name.trim().split(/\s+/)[0] : null,
            canCancel: isCancellableByCustomer(b.status, cutoff),
            isWarrantyRedo: !!b.warrantyClaimOfId,
            canReview: canReviewBooking(b),
            review: b.review,
            warranty: warrantyStatusOf(b),
        }))
    );
}

export async function cancelBooking(raw: unknown): Promise<Result<{ bookingRef: string }>> {
    const parsed = CancelInputSchema.safeParse(withNormalizedMobile(raw));
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const { bookingRef, mobile, reason } = parsed.data;

    const booking = await db.booking.findFirst({ where: { bookingRef: bookingRef.toUpperCase(), mobile } });
    // Same answer for "no such booking" and "not your booking" so references cannot be probed.
    if (!booking) return fail("not_found", "Booking not found");

    if (!isCancellableByCustomer(booking.status, await getCancelCutoff())) {
        return fail("not_cancellable", "This booking can no longer be cancelled online. Please call us.");
    }

    await db.booking.update({
        where: { id: booking.id },
        data: {
            status: "CANCELLED",
            cancelReason: reason || null,
            statusHistory: {
                create: { fromStatus: booking.status, toStatus: "CANCELLED", changedByType: "customer", note: reason || null },
            },
        },
    });

    await notifyCancelled(booking.id);
    return ok({ bookingRef: booking.bookingRef });
}
