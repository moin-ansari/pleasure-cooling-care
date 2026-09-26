import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { normalizeIndianMobile } from "@/lib/phone";
import { istDateString } from "@/lib/time";
import { bookingWhere, isOwner, storeOnlyWhere, type AdminScope } from "@/lib/scope";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import type { BookingStatusValue } from "@/constants/booking";
import { fail, ok, type Result } from "./result";

// Customers have no account. A customer is simply a mobile number that has made bookings.

const PAGE_SIZE = 20;
const num = (v: number | null | undefined) => v ?? 0;

export interface CustomerListItem {
    mobile: string;
    name: string;
    bookings: number;
    lastBookingAt: string;
    spent: number;
    isBlocked: boolean;
}

export interface CustomerList {
    items: CustomerListItem[];
    page: number;
    pageCount: number;
    total: number;
}

export async function listCustomers(scope: AdminScope, options: { q?: string; page?: number }): Promise<CustomerList> {
    const page = Math.max(1, options.page ?? 1);
    const q = (options.q ?? "").trim();
    const digits = q.replace(/\D/g, "");
    const where: Prisma.BookingWhereInput = {
        ...bookingWhere(scope),
        ...(q ? { OR: [{ customerName: { contains: q, mode: "insensitive" } }, ...(digits.length >= 3 ? [{ mobile: { contains: digits } }] : [])] } : {}),
    };

    const [groups, all] = await Promise.all([
        db.booking.groupBy({
            by: ["mobile"],
            where,
            _count: { _all: true },
            _sum: { amountCollected: true },
            _max: { createdAt: true },
            orderBy: { _max: { createdAt: "desc" } },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        db.booking.findMany({ where, distinct: ["mobile"], select: { mobile: true } }),
    ]);

    const mobiles = groups.map((g) => g.mobile);
    const [latest, blocked] = await Promise.all([
        mobiles.length ? db.booking.findMany({ where: { mobile: { in: mobiles }, ...storeOnlyWhere(scope) }, orderBy: { createdAt: "desc" }, select: { mobile: true, customerName: true } }) : [],
        mobiles.length ? db.blockedPhone.findMany({ where: { mobile: { in: mobiles } }, select: { mobile: true } }) : [],
    ]);
    const nameOf = new Map<string, string>();
    for (const b of latest) if (!nameOf.has(b.mobile)) nameOf.set(b.mobile, b.customerName);
    const blockedSet = new Set(blocked.map((b) => b.mobile));

    return {
        items: groups.map((g) => ({
            mobile: g.mobile,
            name: nameOf.get(g.mobile) ?? g.mobile,
            bookings: g._count._all,
            lastBookingAt: (g._max.createdAt ?? new Date()).toISOString(),
            spent: num(g._sum.amountCollected),
            isBlocked: blockedSet.has(g.mobile),
        })),
        page,
        pageCount: Math.max(1, Math.ceil(all.length / PAGE_SIZE)),
        total: all.length,
    };
}

export interface CustomerBooking {
    id: string;
    bookingRef: string;
    status: BookingStatusValue;
    date: string;
    time: string;
    applianceCategory: ApplianceCategoryValue;
    serviceType: string;
    price: number;
    amountCollected: number | null;
    technicianName: string | null;
    town: string;
    district: string;
    isWarrantyRedo: boolean;
    rating: number | null;
}

export interface CustomerDetail {
    mobile: string;
    names: string[];
    isBlocked: boolean;
    blockedReason: string | null;
    firstBookingAt: string;
    totals: { bookings: number; completed: number; cancelled: number; spent: number; claims: number };
    averageRating: number | null;
    bookings: CustomerBooking[];
}

// Only this admin's stores' bookings are shown. A number with none of them is treated as unknown.
export async function getCustomer(scope: AdminScope, rawMobile: string): Promise<CustomerDetail | null> {
    const mobile = normalizeIndianMobile(rawMobile);
    if (!/^[6-9]\d{9}$/.test(mobile)) return null;

    const rows = await db.booking.findMany({
        where: { mobile, ...storeOnlyWhere(scope) },
        orderBy: { createdAt: "desc" },
        include: { serviceArea: { select: { district: true } }, technician: { select: { name: true } }, review: { select: { rating: true } }, _count: { select: { claimsAgainst: true } } },
    });
    if (rows.length === 0) return null;

    const blocked = await db.blockedPhone.findUnique({ where: { mobile } });
    const ratings = rows.map((r) => r.review?.rating).filter((v): v is number => typeof v === "number");

    return {
        mobile,
        names: Array.from(new Set(rows.map((r) => r.customerName))),
        isBlocked: !!blocked,
        blockedReason: blocked?.reason ?? null,
        firstBookingAt: rows[rows.length - 1].createdAt.toISOString(),
        totals: {
            bookings: rows.length,
            completed: rows.filter((r) => r.status === "COMPLETED").length,
            cancelled: rows.filter((r) => r.status === "CANCELLED").length,
            spent: rows.reduce((n, r) => n + num(r.amountCollected), 0),
            claims: rows.reduce((n, r) => n + r._count.claimsAgainst, 0),
        },
        averageRating: ratings.length ? Math.round((ratings.reduce((n, v) => n + v, 0) / ratings.length) * 10) / 10 : null,
        bookings: rows.map((r) => ({
            id: r.id,
            bookingRef: r.bookingRef,
            status: r.status,
            date: istDateString(r.date),
            time: r.time,
            applianceCategory: r.applianceCategory,
            serviceType: r.serviceType,
            price: r.price,
            amountCollected: r.amountCollected,
            technicianName: r.technician?.name ?? null,
            town: r.town,
            district: r.serviceArea.district,
            isWarrantyRedo: !!r.warrantyClaimOfId,
            rating: r.review?.rating ?? null,
        })),
    };
}

// ---------- blocked numbers (owner only) ----------

export interface BlockedItem {
    id: string;
    mobile: string;
    reason: string | null;
    createdAt: string;
    name: string | null;
}

export async function listBlocked(scope: AdminScope): Promise<Result<BlockedItem[]>> {
    if (!isOwner(scope)) return fail("forbidden", "Only the owner can do this");
    const rows = await db.blockedPhone.findMany({ orderBy: { createdAt: "desc" } });
    const names = rows.length ? await db.booking.findMany({ where: { mobile: { in: rows.map((r) => r.mobile) } }, orderBy: { createdAt: "desc" }, select: { mobile: true, customerName: true } }) : [];
    const nameOf = new Map<string, string>();
    for (const b of names) if (!nameOf.has(b.mobile)) nameOf.set(b.mobile, b.customerName);
    return ok(rows.map((r) => ({ id: r.id, mobile: r.mobile, reason: r.reason, createdAt: r.createdAt.toISOString(), name: nameOf.get(r.mobile) ?? null })));
}

// A blocked number cannot book on the website, by voice or through an assistant. Blocking is for abuse, so it is the owner's call.
export async function blockCustomer(scope: AdminScope, rawMobile: string, reason: unknown): Promise<Result<null>> {
    if (!isOwner(scope)) return fail("forbidden", "Only the owner can do this");
    const mobile = normalizeIndianMobile(rawMobile);
    if (!/^[6-9]\d{9}$/.test(mobile)) return fail("invalid", "Enter a valid 10 digit mobile number");
    const why = String(reason ?? "").trim();
    if (why.length < 3) return fail("invalid", "Tell us why you are blocking this number");
    if (why.length > 200) return fail("invalid", "Keep the reason under 200 characters");

    await db.blockedPhone.upsert({ where: { mobile }, update: { reason: why }, create: { mobile, reason: why } });
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "customer.block", entity: "BlockedPhone", entityId: mobile, after: { mobile, reason: why } });
    return ok(null);
}

export async function unblockCustomer(scope: AdminScope, rawMobile: string): Promise<Result<null>> {
    if (!isOwner(scope)) return fail("forbidden", "Only the owner can do this");
    const mobile = normalizeIndianMobile(rawMobile);
    const existing = await db.blockedPhone.findUnique({ where: { mobile } });
    if (!existing) return fail("not_found", "That number is not blocked");
    await db.blockedPhone.delete({ where: { mobile } });
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "customer.unblock", entity: "BlockedPhone", entityId: mobile, before: { mobile, reason: existing.reason } });
    return ok(null);
}
