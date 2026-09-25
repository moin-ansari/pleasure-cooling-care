import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { normalizeIndianMobile } from "@/lib/phone";
import { istDateString } from "@/lib/time";
import { rankFor, DEFAULT_THRESHOLDS, type RankThresholds } from "@/lib/rank";
import { ReviewInputSchema, ReviewVisibilitySchema } from "@/schema/review";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import { fail, ok, type Result } from "./result";

// A review can be left this long after the job was completed.
export const REVIEW_WINDOW_DAYS = 60;

type Tx = Prisma.TransactionClient;

export async function getRankThresholds(client: Tx | typeof db = db): Promise<RankThresholds> {
    const s = await client.settings.findUnique({ where: { id: 1 } });
    if (!s) return DEFAULT_THRESHOLDS;
    return {
        SILVER: { minJobs: s.silverMinJobs, minRating: s.silverMinRating },
        GOLD: { minJobs: s.goldMinJobs, minRating: s.goldMinRating },
        DIAMOND: { minJobs: s.diamondMinJobs, minRating: s.diamondMinRating },
    };
}

// Rating and rank are cached on the technician. Call this whenever a job completes or a review is added, hidden or shown.
// Hidden reviews do not count towards the rating.
export async function recomputeTechnicianStats(tx: Tx, technicianId: string): Promise<void> {
    const [technician, agg, thresholds] = await Promise.all([
        tx.technician.findUnique({ where: { id: technicianId }, select: { jobsCompletedCount: true } }),
        tx.review.aggregate({ where: { technicianId, isPublic: true }, _avg: { rating: true }, _count: { _all: true } }),
        getRankThresholds(tx),
    ]);
    if (!technician) return;

    const averageRating = Math.round((agg._avg.rating ?? 0) * 100) / 100;
    await tx.technician.update({
        where: { id: technicianId },
        data: { averageRating, ratingCount: agg._count._all, rank: rankFor(technician.jobsCompletedCount, averageRating, thresholds) },
    });
}

// ---------- customers ----------

export async function submitReview(raw: unknown): Promise<Result<{ bookingRef: string }>> {
    const normalized =
        raw && typeof raw === "object" && "mobile" in raw ? { ...raw, mobile: normalizeIndianMobile(String((raw as { mobile: unknown }).mobile ?? "")) } : raw;
    const parsed = ReviewInputSchema.safeParse(normalized);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const { bookingRef, mobile, rating, comment } = parsed.data;

    const booking = await db.booking.findFirst({ where: { bookingRef: bookingRef.toUpperCase(), mobile }, include: { review: { select: { id: true } } } });
    // Same answer for "no such booking" and "not your booking" so references cannot be probed.
    if (!booking) return fail("not_found", "Booking not found");
    if (booking.status !== "COMPLETED" || !booking.technicianId) return fail("not_completed", "You can review a booking once the work is complete");
    if (booking.review) return fail("already_reviewed", "You have already reviewed this booking");
    if (booking.completedAt && Date.now() - booking.completedAt.getTime() > REVIEW_WINDOW_DAYS * 86400000) {
        return fail("too_late", "Reviews close 60 days after the work is done");
    }

    const technicianId = booking.technicianId;
    try {
        await db.$transaction(async (tx) => {
            await tx.review.create({ data: { bookingId: booking.id, technicianId, customerName: booking.customerName, rating, comment: comment || null } });
            await recomputeTechnicianStats(tx, technicianId);
        });
    } catch (error: any) {
        // Two taps at once: the unique booking id stops the second review.
        if (error?.code === "P2002") return fail("already_reviewed", "You have already reviewed this booking");
        throw error;
    }
    return ok({ bookingRef: booking.bookingRef });
}

export interface ReviewState {
    rating: number;
    comment: string | null;
}

export function canReviewBooking(b: { status: string; technicianId: string | null; completedAt: Date | null; review: unknown }, now = Date.now()): boolean {
    return b.status === "COMPLETED" && !!b.technicianId && !b.review && (!b.completedAt || now - b.completedAt.getTime() <= REVIEW_WINDOW_DAYS * 86400000);
}

// ---------- public ----------

export interface PublicReview {
    id: string;
    customerName: string;
    rating: number;
    comment: string | null;
    technicianFirstName: string;
    applianceCategory: ApplianceCategoryValue;
    serviceType: string;
    date: string;
}

export interface ReviewSummary {
    count: number;
    average: number;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export async function getPublicReviews(limit = 12): Promise<{ reviews: PublicReview[]; summary: ReviewSummary }> {
    const [rows, agg] = await Promise.all([
        db.review.findMany({
            where: { isPublic: true },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: { technician: { select: { name: true } }, booking: { select: { applianceCategory: true, serviceType: true } } },
        }),
        db.review.aggregate({ where: { isPublic: true }, _avg: { rating: true }, _count: { _all: true } }),
    ]);

    return {
        reviews: rows.map((r) => ({
            id: r.id,
            customerName: r.customerName,
            rating: r.rating,
            comment: r.comment,
            technicianFirstName: firstName(r.technician.name),
            applianceCategory: r.booking.applianceCategory,
            serviceType: r.booking.serviceType,
            date: istDateString(r.createdAt),
        })),
        summary: { count: agg._count._all, average: Math.round((agg._avg.rating ?? 0) * 10) / 10 },
    };
}

// ---------- admin ----------

export interface AdminReview extends PublicReview {
    isPublic: boolean;
    bookingId: string;
    bookingRef: string;
    technicianName: string;
}

export async function listReviewsForAdmin(filter: "all" | "hidden" | "low" = "all"): Promise<AdminReview[]> {
    const where: Prisma.ReviewWhereInput = filter === "hidden" ? { isPublic: false } : filter === "low" ? { rating: { lte: 2 } } : {};
    const rows = await db.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { technician: { select: { name: true } }, booking: { select: { id: true, bookingRef: true, applianceCategory: true, serviceType: true } } },
    });
    return rows.map((r) => ({
        id: r.id,
        customerName: r.customerName,
        rating: r.rating,
        comment: r.comment,
        technicianFirstName: firstName(r.technician.name),
        technicianName: r.technician.name,
        applianceCategory: r.booking.applianceCategory,
        serviceType: r.booking.serviceType,
        date: istDateString(r.createdAt),
        isPublic: r.isPublic,
        bookingId: r.booking.id,
        bookingRef: r.booking.bookingRef,
    }));
}

export async function setReviewVisibility(id: string, adminId: string, raw: unknown): Promise<Result<{ isPublic: boolean }>> {
    const parsed = ReviewVisibilitySchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", "Choose whether the review is shown");

    const review = await db.review.findUnique({ where: { id }, select: { id: true, isPublic: true, technicianId: true } });
    if (!review) return fail("not_found", "Review not found");
    if (review.isPublic === parsed.data.isPublic) return ok({ isPublic: review.isPublic });

    await db.$transaction(async (tx) => {
        await tx.review.update({ where: { id }, data: { isPublic: parsed.data.isPublic } });
        await recomputeTechnicianStats(tx, review.technicianId);
    });
    await logAudit({
        actorType: "admin",
        actorId: adminId,
        action: parsed.data.isPublic ? "review.show" : "review.hide",
        entity: "Review",
        entityId: id,
        before: { isPublic: review.isPublic },
        after: { isPublic: parsed.data.isPublic },
    });
    return ok({ isPublic: parsed.data.isPublic });
}
