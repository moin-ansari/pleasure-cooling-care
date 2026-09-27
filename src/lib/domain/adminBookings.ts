import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { addDaysToDateString, dbDay, formatIst, istDateString, istDateToUtc, istLocalToUtc, slotToMinutes } from "@/lib/time";
import {
    BOOKING_GROUP_STATUSES,
    OPEN_STATUSES,
    UNASSIGNED_ALERT_MINUTES,
    type BookingGroup,
    type BookingStatusValue,
} from "@/constants/booking";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import { AssignInputSchema, BookingEditSchema, CancelInputSchema, NoteInputSchema, PriceInputSchema } from "@/schema/adminBooking";
import { bookingWhere, canAccessStore, storeOnlyWhere, technicianWhere, type AdminScope } from "@/lib/scope";
import { createBooking } from "./bookings";
import { notifyAssigned, notifyCancelled, notifyPriceChanged } from "./notifications";
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
    storeName: string;
    // The technician said they cannot attend and the job needs someone else.
    reassignRequested: boolean;
}

export type CategoryFilter = ApplianceCategoryValue | "all";

export interface AdminBookingList {
    items: AdminBookingListItem[];
    counts: Record<BookingGroup, number>;
    // How many bookings of each appliance are in the selected status group (and match the search), so the
    // number on each tab answers "of what I'm looking at now, how many are AC vs a fridge vs...".
    categoryCounts: Record<ApplianceCategoryValue, number>;
    page: number;
    pageCount: number;
    total: number;
}

const listInclude = {
    serviceArea: { select: { district: true } },
    technician: { select: { name: true } },
    store: { select: { name: true } },
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
        storeName: b.store.name,
        reassignRequested: !!b.reassignRequestedAt,
    };
}

export async function listBookings(
    scope: AdminScope,
    options: { group?: BookingGroup; category?: CategoryFilter; q?: string; page?: number },
): Promise<AdminBookingList> {
    const group = options.group ?? "new";
    const category = options.category ?? "all";
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
    const statusFilter: Prisma.BookingWhereInput = group === "all" ? {} : { status: { in: BOOKING_GROUP_STATUSES[group] } };
    // Everything the category tabs are counted against: the current status group and search, but not the
    // category itself, so a tab's own count reflects what picking it would show.
    const beforeCategory: Prisma.BookingWhereInput = { AND: [bookingWhere(scope), statusFilter, search] };
    const where: Prisma.BookingWhereInput = { AND: [beforeCategory, category === "all" ? {} : { applianceCategory: category }] };

    const orderBy: Prisma.BookingOrderByWithRelationInput[] =
        group === "active"
            ? [{ date: "asc" }, { createdAt: "asc" }]
            : group === "completed"
              ? [{ completedAt: "desc" }]
              : group === "cancelled"
                ? [{ updatedAt: "desc" }]
                : [{ date: "asc" }, { createdAt: "asc" }];

    const [rows, total, statusCounts, categoryCounts] = await Promise.all([
        db.booking.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: listInclude }),
        db.booking.count({ where }),
        db.booking.groupBy({ by: ["status"], where: bookingWhere(scope), _count: { _all: true } }),
        db.booking.groupBy({ by: ["applianceCategory"], where: beforeCategory, _count: { _all: true } }),
    ]);

    const byStatus = new Map(statusCounts.map((s) => [s.status, s._count._all]));
    const sum = (statuses: BookingStatusValue[]) => statuses.reduce((n, s) => n + (byStatus.get(s) ?? 0), 0);
    const byCategory = new Map(categoryCounts.map((c) => [c.applianceCategory, c._count._all]));

    return {
        // Earliest visit first. Time slots are text, so the order within a day is fixed here.
        items: rows
            .map(toListItem)
            .sort((x, y) => (group === "completed" || group === "cancelled" ? 0 : x.date.localeCompare(y.date) || slotToMinutes(x.time) - slotToMinutes(y.time))),
        counts: {
            new: sum(BOOKING_GROUP_STATUSES.new),
            active: sum(BOOKING_GROUP_STATUSES.active),
            completed: sum(BOOKING_GROUP_STATUSES.completed),
            cancelled: sum(BOOKING_GROUP_STATUSES.cancelled),
            all: statusCounts.reduce((n, s) => n + s._count._all, 0),
        },
        categoryCounts: {
            AC: byCategory.get("AC") ?? 0,
            REFRIGERATOR: byCategory.get("REFRIGERATOR") ?? 0,
            WASHING_MACHINE: byCategory.get("WASHING_MACHINE") ?? 0,
            GEYSER: byCategory.get("GEYSER") ?? 0,
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
    // Commission the business earns on a completed job, after any corrections. Null until the job is completed.
    commission: number | null;
    warrantyRedoOfRef: string | null;
    reassignReason: string | null;
    cancelReason: string | null;
    technicianNotes: string | null;
    utmSource: string | null;
    utmCampaign: string | null;
    history: HistoryEntry[];
    canAssign: boolean;
    canCancel: boolean;
    canEditPrice: boolean;
    canEdit: boolean;
    canMoveVisit: boolean;
}

// A booking outside the admin's stores is treated as if it does not exist. A city picked in the switcher does not hide it.
export async function getBookingDetail(scope: AdminScope, id: string): Promise<AdminBookingDetail | null> {
    const b = await db.booking.findFirst({
        where: { id, ...storeOnlyWhere(scope) },
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

    const commissionSum =
        b.status === "COMPLETED"
            ? await db.ledgerEntry.aggregate({ _sum: { amount: true }, where: { bookingId: b.id, type: { in: ["COMMISSION_OWED", "ADJUSTMENT"] } } })
            : null;

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
        commission: commissionSum ? Math.round(Number(commissionSum._sum.amount ?? 0) * 100) / 100 : null,
        warrantyRedoOfRef: b.warrantyClaimOf?.bookingRef ?? null,
        reassignReason: b.reassignRequestedAt ? b.reassignReason : null,
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
        canEdit: open,
        canMoveVisit: b.status === "NEW",
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
    storeName: string;
    // Same store as the booking. Picking someone from another store moves the booking to that store.
    sameStore: boolean;
    // They marked the booking's day as not available.
    isOffThatDay: boolean;
}

// Active technicians, best fit first: works in the district, handles the appliance, then fewest open jobs.
export async function listAssignableTechnicians(scope: AdminScope, bookingId: string): Promise<AssignableTechnician[] | null> {
    const booking = await db.booking.findFirst({
        where: { id: bookingId, ...storeOnlyWhere(scope) },
        select: { serviceAreaId: true, applianceCategory: true, date: true, technicianId: true, storeId: true },
    });
    if (!booking) return null;

    const [technicians, openJobs, sameDay, offToday] = await Promise.all([
        // A co-admin can only pick from their own store's technicians. The owner can pick anyone.
        db.technician.findMany({ where: { isActive: true, ...storeOnlyWhere(scope) }, include: { serviceAreas: { select: { id: true } }, store: { select: { name: true } } } }),
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
        db.technicianUnavailability.findMany({ where: { date: dbDay(istDateString(booking.date)) }, select: { technicianId: true } }),
    ]);
    const offSet = new Set(offToday.map((o) => o.technicianId));
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
        storeName: t.store.name,
        sameStore: t.storeId === booking.storeId,
        isOffThatDay: offSet.has(t.id),
    }));

    const fit = (t: AssignableTechnician) => (t.isOffThatDay ? -8 : 0) + (t.sameStore ? 4 : 0) + (t.worksInDistrict ? 2 : 0) + (t.handlesAppliance ? 1 : 0);
    return items.sort((a, b) => fit(b) - fit(a) || a.activeJobs - b.activeJobs || a.name.localeCompare(b.name));
}

// Confirms the booking and assigns a technician in one step. Also used to reassign or change the arrival time.
export async function assignBooking(scope: AdminScope, bookingId: string, raw: unknown): Promise<Result<AdminBookingDetail>> {
    const parsed = AssignInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const arrival = istLocalToUtc(parsed.data.arrivalAt);
    const now = Date.now();
    if (Number.isNaN(arrival.getTime()) || arrival.getTime() < now - 10 * 60000 || arrival.getTime() > now + 60 * 86400000) {
        return fail("invalid_arrival", "Choose an arrival time from now up to 60 days ahead");
    }

    const adminId = scope.adminId;
    const booking = await db.booking.findFirst({ where: { id: bookingId, ...storeOnlyWhere(scope) }, include: { technician: { select: { id: true, name: true } } } });
    if (!booking) return fail("not_found", "Booking not found");
    if (!OPEN_STATUSES.includes(booking.status)) return fail("closed", "This booking is already closed");

    const technician = await db.technician.findUnique({ where: { id: parsed.data.technicianId }, select: { id: true, name: true, isActive: true, storeId: true, store: { select: { name: true } } } });
    // A co-admin cannot reach another store's technician. The technician simply does not exist for them.
    if (!technician || !canAccessStore(scope, technician.storeId)) return fail("technician_unavailable", "That technician is not available");
    if (!technician.isActive) return fail("technician_unavailable", "That technician is not active");
    // The owner may pick a technician from another store. The job then earns for that technician's store.
    const movesStore = technician.storeId !== booking.storeId;

    // Someone who marked that day as not available is only assigned once the admin has said yes to that.
    const arrivalDay = istDateString(arrival);
    if (!parsed.data.acknowledgeOff && !(technician.id === booking.technicianId)) {
        const off = await db.technicianUnavailability.findUnique({ where: { technicianId_date: { technicianId: technician.id, date: dbDay(arrivalDay) } } });
        if (off) return fail("technician_off", `${technician.name} marked ${arrivalDay} as not available. Assign anyway?`);
    }

    const sameTechnician = booking.technicianId === technician.id;
    const note = movesStore
        ? `Assigned to ${technician.name} of ${technician.store.name}, arrival ${formatIst(arrival)}. The booking now belongs to ${technician.store.name}.`
        : sameTechnician
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
                ...(movesStore ? { storeId: technician.storeId } : {}),
                // Whoever takes the job answers the "cannot attend" request.
                reassignRequestedAt: null,
                reassignReason: null,
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
    await notifyAssigned(bookingId, booking.technicianId);

    return ok((await getBookingDetail(scope, bookingId))!);
}

export async function cancelBookingByAdmin(scope: AdminScope, bookingId: string, raw: unknown): Promise<Result<AdminBookingDetail>> {
    const parsed = CancelInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const adminId = scope.adminId;
    const booking = await db.booking.findFirst({ where: { id: bookingId, ...storeOnlyWhere(scope) }, select: { status: true } });
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
    await notifyCancelled(bookingId);

    return ok((await getBookingDetail(scope, bookingId))!);
}

export async function updateBookingPrice(scope: AdminScope, bookingId: string, raw: unknown): Promise<Result<AdminBookingDetail>> {
    const parsed = PriceInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const adminId = scope.adminId;
    const booking = await db.booking.findFirst({ where: { id: bookingId, ...storeOnlyWhere(scope) }, select: { status: true, price: true } });
    if (!booking) return fail("not_found", "Booking not found");
    if (!OPEN_STATUSES.includes(booking.status)) return fail("closed", "The price of a closed booking cannot be changed");
    if (booking.price === parsed.data.price) return ok((await getBookingDetail(scope, bookingId))!);

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
    await notifyPriceChanged(bookingId, booking.price);

    return ok((await getBookingDetail(scope, bookingId))!);
}

// Fixes typos in the customer's details or moves the requested visit. Not for closed bookings.
export async function editBookingDetails(scope: AdminScope, bookingId: string, raw: unknown): Promise<Result<AdminBookingDetail>> {
    const parsed = BookingEditSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const d = parsed.data;

    const booking = await db.booking.findFirst({ where: { id: bookingId, ...storeOnlyWhere(scope) } });
    if (!booking) return fail("not_found", "Booking not found");
    if (!OPEN_STATUSES.includes(booking.status)) return fail("closed", "A closed booking cannot be edited");

    const data: Prisma.BookingUpdateInput = {};
    const notes: string[] = [];
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const set = (key: "customerName" | "streetAddress" | "town" | "pincode", label: string) => {
        if (d[key] !== undefined && d[key] !== booking[key]) {
            data[key] = d[key];
            before[key] = booking[key];
            after[key] = d[key];
            notes.push(label);
        }
    };
    set("customerName", "name");
    set("streetAddress", "address");
    set("town", "town");
    set("pincode", "pincode");

    if (d.date !== undefined && d.time !== undefined) {
        // The customer was already promised a confirmed time, so only unconfirmed bookings can move.
        if (booking.status !== "NEW") return fail("already_confirmed", "This visit is already confirmed. Change the arrival time when you assign the technician.");
        const newDate = istDateToUtc(d.date);
        if (Number.isNaN(newDate.getTime())) return fail("invalid", "Choose a valid date");
        const dayDiff = (newDate.getTime() - istDateToUtc(istDateString()).getTime()) / 86400000;
        if (dayDiff < 0 || dayDiff > 60) return fail("invalid", "Choose a day from today up to 60 days ahead");
        if (newDate.getTime() !== booking.date.getTime() || d.time !== booking.time) {
            data.date = newDate;
            data.time = d.time;
            before.visit = `${istDateString(booking.date)} ${booking.time}`;
            after.visit = `${d.date} ${d.time}`;
            notes.push(`visit moved to ${d.date}, ${d.time}`);
        }
    }
    if (notes.length === 0) return ok((await getBookingDetail(scope, bookingId))!);

    const changed = await db.$transaction(async (tx) => {
        const result = await tx.booking.updateMany({ where: { id: bookingId, status: booking.status }, data: data as Prisma.BookingUncheckedUpdateManyInput });
        if (result.count === 0) return false;
        await tx.bookingStatusHistory.create({
            data: { bookingId, fromStatus: booking.status, toStatus: booking.status, changedByType: "admin", changedById: scope.adminId, note: `Edited: ${notes.join(", ")}` },
        });
        return true;
    });
    if (!changed) return fail("conflict", "This booking was just updated. Please refresh.");

    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "booking.edit", entity: "Booking", entityId: bookingId, before, after });
    return ok((await getBookingDetail(scope, bookingId))!);
}

// A private note for the team. The customer never sees it.
export async function addBookingNote(scope: AdminScope, bookingId: string, raw: unknown): Promise<Result<AdminBookingDetail>> {
    const parsed = NoteInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const booking = await db.booking.findFirst({ where: { id: bookingId, ...storeOnlyWhere(scope) }, select: { status: true } });
    if (!booking) return fail("not_found", "Booking not found");
    await db.bookingStatusHistory.create({
        data: { bookingId, fromStatus: booking.status, toStatus: booking.status, changedByType: "admin", changedById: scope.adminId, note: `Note: ${parsed.data.note}` },
    });
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "booking.note", entity: "Booking", entityId: bookingId, before: {}, after: { note: parsed.data.note } });
    return ok((await getBookingDetail(scope, bookingId))!);
}

export interface DashboardStats {
    counts: Record<Exclude<BookingGroup, "all">, number>;
    unassignedStale: number;
    today: { newBookings: number; completed: number; collected: number };
    month: { completed: number; collected: number };
    technicians: { active: number; busy: number };
    chart: { date: string; Bookings: number }[];
    attention: { delayed: number; pendingClaims: number; failedMessages: number; reassignRequests: number };
    // Waiting for a technician, oldest first.
    newQueue: AdminBookingListItem[];
    // Confirmed and running jobs by visit time, overdue ones first.
    schedule: (AdminBookingListItem & { isOverdue: boolean })[];
    teamNow: { id: string; name: string; openJobs: number }[];
}

export async function getDashboardStats(scope: AdminScope): Promise<DashboardStats> {
    const bw = bookingWhere(scope);
    const tw = technicianWhere(scope);
    const today = istDateString();
    const dayStart = istDateToUtc(today);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const monthStart = istDateToUtc(`${today.slice(0, 8)}01`);
    const chartStart = istDateToUtc(addDaysToDateString(today, -13));
    const staleBefore = new Date(Date.now() - UNASSIGNED_ALERT_MINUTES * 60000);

    const [statusCounts, newToday, doneToday, collectedToday, doneMonth, collectedMonth, stale, activeTechnicians, busy, recent, delayed, pendingClaims, failedMessages, queueRows, scheduleRows, team, reassignRequests] = await Promise.all([
        db.booking.groupBy({ by: ["status"], where: bw, _count: { _all: true } }),
        db.booking.count({ where: { ...bw, createdAt: { gte: dayStart, lt: dayEnd } } }),
        db.booking.count({ where: { ...bw, status: "COMPLETED", completedAt: { gte: dayStart, lt: dayEnd } } }),
        db.booking.aggregate({ _sum: { amountCollected: true }, where: { ...bw, status: "COMPLETED", completedAt: { gte: dayStart, lt: dayEnd } } }),
        db.booking.count({ where: { ...bw, status: "COMPLETED", completedAt: { gte: monthStart } } }),
        db.booking.aggregate({ _sum: { amountCollected: true }, where: { ...bw, status: "COMPLETED", completedAt: { gte: monthStart } } }),
        db.booking.count({ where: { ...bw, status: "NEW", createdAt: { lt: staleBefore } } }),
        db.technician.count({ where: { ...tw, isActive: true } }),
        db.booking.groupBy({ by: ["technicianId"], where: { ...bw, technicianId: { not: null }, status: { in: OPEN_STATUSES }, technician: { isActive: true } } }),
        db.booking.findMany({ where: { ...bw, createdAt: { gte: chartStart } }, select: { createdAt: true } }),
        db.booking.count({ where: { ...bw, status: "DELAYED" } }),
        db.warrantyClaim.count({ where: { status: "PENDING", originalBooking: bw } }),
        db.notificationLog.count({ where: { ...storeOnlyWhere(scope), status: "FAILED", createdAt: { gte: new Date(Date.now() - 3 * 86400000) } } }),
        db.booking.findMany({ where: { ...bw, status: "NEW" }, orderBy: { createdAt: "asc" }, take: 5, include: listInclude }),
        db.booking.findMany({ where: { ...bw, status: { in: ["CONFIRMED", "ARRIVING", "WORKING", "DELAYED"] } }, orderBy: [{ date: "asc" }], take: 40, include: listInclude }),
        db.technician.findMany({
            where: { ...tw, isActive: true },
            orderBy: { name: "asc" },
            select: { id: true, name: true, _count: { select: { bookings: { where: { status: { in: OPEN_STATUSES } } } } } },
        }),
        db.booking.count({ where: { ...bw, reassignRequestedAt: { not: null }, status: { in: OPEN_STATUSES } } }),
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
        attention: { delayed, pendingClaims, failedMessages, reassignRequests },
        newQueue: queueRows.map(toListItem),
        schedule: scheduleRows
            .map((b) => ({ ...toListItem(b), isOverdue: b.date.getTime() < dayStart.getTime() }))
            .sort((a, b) => a.date.localeCompare(b.date) || slotToMinutes(a.time) - slotToMinutes(b.time))
            .slice(0, 8),
        teamNow: team.map((t) => ({ id: t.id, name: t.name, openJobs: t._count.bookings })),
    };
}

// ---------- booking on behalf of a customer who phoned ----------

// The same rules as the website form, for a city this admin is allowed to serve. The customer gets the usual message.
export async function createBookingForAdmin(scope: AdminScope, raw: unknown): Promise<Result<{ id: string; bookingRef: string; price: number }>> {
    const areaId = raw && typeof raw === "object" && "serviceAreaId" in raw ? String((raw as { serviceAreaId: unknown }).serviceAreaId ?? "") : "";
    const area = areaId ? await db.serviceArea.findUnique({ where: { id: areaId }, select: { storeId: true } }) : null;
    if (!area || !canAccessStore(scope, area.storeId)) return fail("not_found", "Choose one of your cities");

    const mobile = raw && typeof raw === "object" && "mobile" in raw ? String((raw as { mobile: unknown }).mobile ?? "").replace(/\D/g, "").slice(-10) : "";
    if (mobile && (await db.blockedPhone.findUnique({ where: { mobile } }))) {
        return fail("blocked", "This number is blocked. The owner can unblock it from Customers.");
    }

    const result = await createBooking(raw, { source: "ADMIN", actor: { type: "admin", id: scope.adminId } });
    if (!result.ok) return result;

    const booking = await db.booking.findUnique({ where: { bookingRef: result.data.bookingRef }, select: { id: true } });
    if (!booking) return fail("unknown", "Could not find the new booking");
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "booking.createByAdmin", entity: "Booking", entityId: booking.id, after: { bookingRef: result.data.bookingRef } });
    return ok({ id: booking.id, bookingRef: result.data.bookingRef, price: result.data.price });
}

// ---------- schedule ----------

export interface ScheduleDay {
    date: string;
    count: number;
}

export interface Schedule {
    date: string;
    days: ScheduleDay[];
    items: AdminBookingListItem[];
}

const SCHEDULE_DAYS = 14;

// Everything planned for one day, by time slot, and how busy each of the coming days is.
export async function getSchedule(scope: AdminScope, requested?: string): Promise<Schedule> {
    const today = istDateString();
    const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;
    const first = addDaysToDateString(today, -1);
    const last = addDaysToDateString(today, SCHEDULE_DAYS - 2);

    const [rows, counts] = await Promise.all([
        db.booking.findMany({ where: { ...bookingWhere(scope), date: istDateToUtc(date), status: { not: "CANCELLED" } }, include: listInclude, orderBy: { createdAt: "asc" } }),
        db.booking.groupBy({ by: ["date"], where: { ...bookingWhere(scope), status: { not: "CANCELLED" }, date: { gte: istDateToUtc(first), lte: istDateToUtc(last) } }, _count: { _all: true } }),
    ]);

    const countOf = new Map(counts.map((c) => [istDateString(c.date), c._count._all]));
    const days: ScheduleDay[] = [];
    for (let d = first; d <= last; d = addDaysToDateString(d, 1)) days.push({ date: d, count: countOf.get(d) ?? 0 });

    const items = rows.map(toListItem).sort((a, b) => slotToMinutes(a.time) - slotToMinutes(b.time));
    return { date, days, items };
}
