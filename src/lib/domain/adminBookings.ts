import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { addDaysToDateString, istDateString, istDateToUtc, istLocalToUtc } from "@/lib/time";
import {
    BOOKING_GROUP_STATUSES,
    OPEN_STATUSES,
    UNASSIGNED_ALERT_MINUTES,
    type BookingGroup,
    type BookingStatusValue,
} from "@/constants/booking";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import { AssignInputSchema, CancelInputSchema, PriceInputSchema } from "@/schema/adminBooking";
import { fail, ok, type Result } from "./result";

const PAGE_SIZE = 20;

export interface AdminBookingListItem {
    id: string;
    bookingRef: string;
    status: BookingStatusValue;
    customerName: string;
    mobile: string;
    applianceCategory: ApplianceCategoryValue;
    applianceSubType: string;
    serviceType: string;
    district: string;
    town: string;
    date: string;
    time: string;
    price: number;
    technicianName: string | null;
    createdAt: string;
    isStale: boolean;
}

export interface AdminBookingList {
    items: AdminBookingListItem[];
    counts: Record<BookingGroup, number>;
    page: number;
    pageCount: number;
    total: number;
}

const listInclude = {
    serviceArea: { select: { district: true } },
    technician: { select: { name: true } },
} as const;

function toListItem(b: Prisma.BookingGetPayload<{ include: typeof listInclude }>): AdminBookingListItem {
    const waitedMinutes = (Date.now() - b.createdAt.getTime()) / 60000;
    return {
        id: b.id,
        bookingRef: b.bookingRef,
        status: b.status,
        customerName: b.customerName,
        mobile: b.mobile,
        applianceCategory: b.applianceCategory,
        applianceSubType: b.applianceSubType,
        serviceType: b.serviceType,
        district: b.serviceArea.district,
        town: b.town,
        date: istDateString(b.date),
        time: b.time,
        price: b.price,
        technicianName: b.technician?.name ?? null,
        createdAt: b.createdAt.toISOString(),
        isStale: b.status === "NEW" && waitedMinutes >= UNASSIGNED_ALERT_MINUTES,
    };
}

export async function listBookings(options: { group?: BookingGroup; q?: string; page?: number }): Promise<AdminBookingList> {
    const group = options.group ?? "new";
    const page = Math.max(1, options.page ?? 1);
    const q = (options.q ?? "").trim();
    const digits = q.replace(/\D/g, "");

    const search: Prisma.BookingWhereInput = q
        ? {
              OR: [
                  { bookingRef: { contains: q, mode: "insensitive" } },
                  { customerName: { contains: q, mode: "insensitive" } },
                  ...(digits.length >= 3 ? [{ mobile: { contains: digits } }] : []),
              ],
          }
        : {};
    const where: Prisma.BookingWhereInput = {
        AND: [group === "all" ? {} : { status: { in: BOOKING_GROUP_STATUSES[group] } }, search],
    };

    const orderBy: Prisma.BookingOrderByWithRelationInput[] =
        group === "active"
            ? [{ date: "asc" }, { createdAt: "asc" }]
            : group === "completed"
              ? [{ completedAt: "desc" }]
              : group === "cancelled"
                ? [{ updatedAt: "desc" }]
                : [{ createdAt: "desc" }];

    const [rows, total, statusCounts] = await Promise.all([
        db.booking.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: listInclude }),
        db.booking.count({ where }),
        db.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const byStatus = new Map(statusCounts.map((s) => [s.status, s._count._all]));
    const sum = (statuses: BookingStatusValue[]) => statuses.reduce((n, s) => n + (byStatus.get(s) ?? 0), 0);

    return {
        items: rows.map(toListItem),
        counts: {
            new: sum(BOOKING_GROUP_STATUSES.new),
            active: sum(BOOKING_GROUP_STATUSES.active),
            completed: sum(BOOKING_GROUP_STATUSES.completed),
            cancelled: sum(BOOKING_GROUP_STATUSES.cancelled),
            all: statusCounts.reduce((n, s) => n + s._count._all, 0),
        },
        page,
        pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        total,
    };
}

export interface HistoryEntry {
    id: string;
    fromStatus: BookingStatusValue | null;
    toStatus: BookingStatusValue;
    actor: string;
    note: string | null;
    createdAt: string;
}

export interface AdminBookingDetail extends AdminBookingListItem {
    streetAddress: string;
    pincode: string;
    lat: number | null;
    lng: number | null;
    source: string;
    technician: { id: string; name: string; phone: string } | null;
    confirmedArrivalAt: string | null;
    etaAt: string | null;
    laborAmount: number;
    partsAmount: number;
    amountCollected: number | null;
    completedAt: string | null;
    warrantyExpiresAt: string | null;
    warrantyRedoOfRef: string | null;
    cancelReason: string | null;
    technicianNotes: string | null;
    utmSource: string | null;
    utmCampaign: string | null;
    history: HistoryEntry[];
    canAssign: boolean;
    canCancel: boolean;
    canEditPrice: boolean;
}

export async function getBookingDetail(id: string): Promise<AdminBookingDetail | null> {
    const b = await db.booking.findUnique({
        where: { id },
        include: {
            ...listInclude,
            technician: { select: { id: true, name: true, phone: true } },
            statusHistory: { orderBy: { createdAt: "asc" } },
            warrantyClaimOf: { select: { bookingRef: true } },
        },
    });
    if (!b) return null;

    const technicianIds = b.statusHistory.filter((h) => h.changedByType === "technician" && h.changedById).map((h) => h.changedById!);
    const adminIds = b.statusHistory.filter((h) => h.changedByType === "admin" && h.changedById).map((h) => h.changedById!);
    const [technicians, admins] = await Promise.all([
        technicianIds.length ? db.technician.findMany({ where: { id: { in: technicianIds } }, select: { id: true, name: true } }) : [],
        adminIds.length ? db.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, email: true } }) : [],
    ]);
    const technicianName = new Map(technicians.map((t) => [t.id, t.name]));
    const adminEmail = new Map(admins.map((a) => [a.id, a.email]));

    const actorOf = (type: string, actorId: string | null) => {
        if (type === "technician") return actorId ? technicianName.get(actorId) ?? "Technician" : "Technician";
        if (type === "admin") return actorId ? adminEmail.get(actorId) ?? "Admin" : "Admin";
        if (type === "customer") return "Customer";
        return "System";
    };

    const open = OPEN_STATUSES.includes(b.status);
    return {
        ...toListItem(b),
        streetAddress: b.streetAddress,
        pincode: b.pincode,
        lat: b.lat,
        lng: b.lng,
        source: b.source,
        technician: b.technician,
        confirmedArrivalAt: b.confirmedArrivalAt?.toISOString() ?? null,
        etaAt: b.etaAt?.toISOString() ?? null,
        laborAmount: b.laborAmount,
        partsAmount: b.partsAmount,
        amountCollected: b.amountCollected,
        completedAt: b.completedAt?.toISOString() ?? null,
        warrantyExpiresAt: b.warrantyExpiresAt?.toISOString() ?? null,
        warrantyRedoOfRef: b.warrantyClaimOf?.bookingRef ?? null,
        cancelReason: b.cancelReason,
        technicianNotes: b.technicianNotes,
        utmSource: b.utmSource,
        utmCampaign: b.utmCampaign,
        history: b.statusHistory.map((h) => ({
            id: h.id,
            fromStatus: h.fromStatus,
            toStatus: h.toStatus,
            actor: actorOf(h.changedByType, h.changedById),
            note: h.note,
            createdAt: h.createdAt.toISOString(),
        })),
        canAssign: open,
        canCancel: open,
        canEditPrice: open,
    };
}

export interface AssignableTechnician {
    id: string;
    name: string;
    phone: string;
    rank: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";
    averageRating: number;
    ratingCount: number;
    activeJobs: number;
    jobsThatDay: number;
    worksInDistrict: boolean;
    handlesAppliance: boolean;
    isCurrent: boolean;
}

// Active technicians, best fit first: works in the district, handles the appliance, then fewest open jobs.
export async function listAssignableTechnicians(bookingId: string): Promise<AssignableTechnician[] | null> {
    const booking = await db.booking.findUnique({
        where: { id: bookingId },
        select: { serviceAreaId: true, applianceCategory: true, date: true, technicianId: true },
    });
    if (!booking) return null;

    const [technicians, openJobs, sameDay] = await Promise.all([
        db.technician.findMany({ where: { isActive: true }, include: { serviceAreas: { select: { id: true } } } }),
        db.booking.groupBy({
            by: ["technicianId"],
            where: { technicianId: { not: null }, status: { in: OPEN_STATUSES } },
            _count: { _all: true },
        }),
        db.booking.groupBy({
            by: ["technicianId"],
            where: { technicianId: { not: null }, date: booking.date, status: { not: "CANCELLED" }, id: { not: bookingId } },
            _count: { _all: true },
        }),
    ]);
    const openBy = new Map(openJobs.map((j) => [j.technicianId, j._count._all]));
    const dayBy = new Map(sameDay.map((j) => [j.technicianId, j._count._all]));

    const items = technicians.map((t) => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        rank: t.rank,
        averageRating: t.averageRating,
        ratingCount: t.ratingCount,
        activeJobs: openBy.get(t.id) ?? 0,
        jobsThatDay: dayBy.get(t.id) ?? 0,
        worksInDistrict: t.serviceAreas.some((a) => a.id === booking.serviceAreaId),
        handlesAppliance: t.specializations.includes(booking.applianceCategory),
        isCurrent: t.id === booking.technicianId,
    }));

    const fit = (t: AssignableTechnician) => (t.worksInDistrict ? 2 : 0) + (t.handlesAppliance ? 1 : 0);
    return items.sort((a, b) => fit(b) - fit(a) || a.activeJobs - b.activeJobs || a.name.localeCompare(b.name));
}

const formatIst = (date: Date) =>
    date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

// Confirms the booking and assigns a technician in one step. Also used to reassign or change the arrival time.
export async function assignBooking(bookingId: string, adminId: string, raw: unknown): Promise<Result<AdminBookingDetail>> {
    const parsed = AssignInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const arrival = istLocalToUtc(parsed.data.arrivalAt);
    const now = Date.now();
    if (Number.isNaN(arrival.getTime()) || arrival.getTime() < now - 10 * 60000 || arrival.getTime() > now + 60 * 86400000) {
        return fail("invalid_arrival", "Choose an arrival time from now up to 60 days ahead");
    }

    const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { technician: { select: { id: true, name: true } } } });
    if (!booking) return fail("not_found", "Booking not found");
    if (!OPEN_STATUSES.includes(booking.status)) return fail("closed", "This booking is already closed");

    const technician = await db.technician.findUnique({ where: { id: parsed.data.technicianId }, select: { id: true, name: true, isActive: true } });
    if (!technician || !technician.isActive) return fail("technician_unavailable", "That technician is not active");

    const sameTechnician = booking.technicianId === technician.id;
    const note = sameTechnician
        ? `Arrival time set to ${formatIst(arrival)}`
        : booking.technician
          ? `Reassigned from ${booking.technician.name} to ${technician.name}, arrival ${formatIst(arrival)}`
          : `Assigned to ${technician.name}, arrival ${formatIst(arrival)}`;

    const changed = await db.$transaction(async (tx) => {
        // A job someone already started goes back to Confirmed for the new technician.
        const result = await tx.booking.updateMany({
            where: { id: bookingId, status: booking.status },
            data: {
                status: "CONFIRMED",
                technicianId: technician.id,
                confirmedArrivalAt: arrival,
                ...(sameTechnician ? {} : { etaAt: null }),
            },
        });
        if (result.count === 0) return false;
        await tx.bookingStatusHistory.create({
            data: { bookingId, fromStatus: booking.status, toStatus: "CONFIRMED", changedByType: "admin", changedById: adminId, note },
        });
        return true;
    });
    if (!changed) return fail("conflict", "This booking was just updated. Please refresh.");

    await logAudit({
        actorType: "admin",
        actorId: adminId,
        action: sameTechnician ? "booking.arrivalChange" : booking.technicianId ? "booking.reassign" : "booking.assign",
        entity: "Booking",
        entityId: bookingId,
        before: { technicianId: booking.technicianId, status: booking.status },
        after: { technicianId: technician.id, status: "CONFIRMED", arrivalAt: arrival.toISOString() },
    });

    return ok((await getBookingDetail(bookingId))!);
}

export async function cancelBookingByAdmin(bookingId: string, adminId: string, raw: unknown): Promise<Result<AdminBookingDetail>> {
    const parsed = CancelInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { status: true } });
    if (!booking) return fail("not_found", "Booking not found");
    if (!OPEN_STATUSES.includes(booking.status)) return fail("closed", "This booking is already closed");

    const changed = await db.$transaction(async (tx) => {
        const result = await tx.booking.updateMany({
            where: { id: bookingId, status: booking.status },
            data: { status: "CANCELLED", cancelReason: parsed.data.reason },
        });
        if (result.count === 0) return false;
        await tx.bookingStatusHistory.create({
            data: { bookingId, fromStatus: booking.status, toStatus: "CANCELLED", changedByType: "admin", changedById: adminId, note: parsed.data.reason },
        });
        return true;
    });
    if (!changed) return fail("conflict", "This booking was just updated. Please refresh.");

    await logAudit({
        actorType: "admin",
        actorId: adminId,
        action: "booking.cancel",
        entity: "Booking",
        entityId: bookingId,
        before: { status: booking.status },
        after: { status: "CANCELLED", reason: parsed.data.reason },
    });

    return ok((await getBookingDetail(bookingId))!);
}

export async function updateBookingPrice(bookingId: string, adminId: string, raw: unknown): Promise<Result<AdminBookingDetail>> {
    const parsed = PriceInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { status: true, price: true } });
    if (!booking) return fail("not_found", "Booking not found");
    if (!OPEN_STATUSES.includes(booking.status)) return fail("closed", "The price of a closed booking cannot be changed");
    if (booking.price === parsed.data.price) return ok((await getBookingDetail(bookingId))!);

    const note = `Price changed from ₹${booking.price} to ₹${parsed.data.price}${parsed.data.note ? `: ${parsed.data.note}` : ""}`;
    const changed = await db.$transaction(async (tx) => {
        const result = await tx.booking.updateMany({
            where: { id: bookingId, status: booking.status },
            data: { price: parsed.data.price },
        });
        if (result.count === 0) return false;
        await tx.bookingStatusHistory.create({
            data: { bookingId, fromStatus: booking.status, toStatus: booking.status, changedByType: "admin", changedById: adminId, note },
        });
        return true;
    });
    if (!changed) return fail("conflict", "This booking was just updated. Please refresh.");

    await logAudit({
        actorType: "admin",
        actorId: adminId,
        action: "booking.priceChange",
        entity: "Booking",
        entityId: bookingId,
        before: { price: booking.price },
        after: { price: parsed.data.price, note: parsed.data.note ?? null },
    });

    return ok((await getBookingDetail(bookingId))!);
}

export interface DashboardStats {
    counts: Record<Exclude<BookingGroup, "all">, number>;
    unassignedStale: number;
    today: { newBookings: number; completed: number; collected: number };
    month: { completed: number; collected: number };
    technicians: { active: number; busy: number };
    chart: { date: string; Bookings: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const today = istDateString();
    const dayStart = istDateToUtc(today);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const monthStart = istDateToUtc(`${today.slice(0, 8)}01`);
    const chartStart = istDateToUtc(addDaysToDateString(today, -13));
    const staleBefore = new Date(Date.now() - UNASSIGNED_ALERT_MINUTES * 60000);

    const [statusCounts, newToday, doneToday, collectedToday, doneMonth, collectedMonth, stale, activeTechnicians, busy, recent] = await Promise.all([
        db.booking.groupBy({ by: ["status"], _count: { _all: true } }),
        db.booking.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        db.booking.count({ where: { status: "COMPLETED", completedAt: { gte: dayStart, lt: dayEnd } } }),
        db.booking.aggregate({ _sum: { amountCollected: true }, where: { status: "COMPLETED", completedAt: { gte: dayStart, lt: dayEnd } } }),
        db.booking.count({ where: { status: "COMPLETED", completedAt: { gte: monthStart } } }),
        db.booking.aggregate({ _sum: { amountCollected: true }, where: { status: "COMPLETED", completedAt: { gte: monthStart } } }),
        db.booking.count({ where: { status: "NEW", createdAt: { lt: staleBefore } } }),
        db.technician.count({ where: { isActive: true } }),
        db.booking.groupBy({ by: ["technicianId"], where: { technicianId: { not: null }, status: { in: OPEN_STATUSES }, technician: { isActive: true } } }),
        db.booking.findMany({ where: { createdAt: { gte: chartStart } }, select: { createdAt: true } }),
    ]);

    const byStatus = new Map(statusCounts.map((s) => [s.status, s._count._all]));
    const sum = (statuses: BookingStatusValue[]) => statuses.reduce((n, s) => n + (byStatus.get(s) ?? 0), 0);

    const perDay = new Map<string, number>();
    for (const r of recent) {
        const key = istDateString(r.createdAt);
        perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    const chart = Array.from({ length: 14 }, (_, i) => {
        const date = addDaysToDateString(today, i - 13);
        return { date: date.slice(5), Bookings: perDay.get(date) ?? 0 };
    });

    return {
        counts: {
            new: sum(BOOKING_GROUP_STATUSES.new),
            active: sum(BOOKING_GROUP_STATUSES.active),
            completed: sum(BOOKING_GROUP_STATUSES.completed),
            cancelled: sum(BOOKING_GROUP_STATUSES.cancelled),
        },
        unassignedStale: stale,
        today: { newBookings: newToday, completed: doneToday, collected: collectedToday._sum.amountCollected ?? 0 },
        month: { completed: doneMonth, collected: collectedMonth._sum.amountCollected ?? 0 },
        technicians: { active: activeTechnicians, busy: busy.length },
        chart,
    };
}
