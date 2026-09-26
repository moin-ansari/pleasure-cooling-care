import { db } from "@/lib/db";
import { dbDay, fromDbDay, istDateString, slotToMinutes } from "@/lib/time";
import { monthRange, currentMonth } from "@/lib/dateRange";
import { round2 } from "@/lib/money";
import { storeOnlyWhere, type AdminScope } from "@/lib/scope";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import type { BookingStatusValue } from "@/constants/booking";
import { getTechnician, type TechnicianDetail } from "./technicians";
import { getTechnicianBalance } from "./finance";

export interface ProfileJob {
    id: string;
    bookingRef: string;
    status: BookingStatusValue;
    date: string;
    time: string;
    serviceType: string;
    applianceCategory: ApplianceCategoryValue;
    town: string;
    customerName: string;
    price: number;
    amountCollected: number | null;
    reassignRequested: boolean;
}

export interface TechnicianProfile {
    technician: TechnicianDetail;
    hasIdProof: boolean;
    storeId: string;
    stats: {
        jobsDone: number;
        openJobs: number;
        monthJobs: number;
        monthCollected: number;
        monthCommission: number;
        balance: number;
    };
    upcoming: ProfileJob[];
    recent: ProfileJob[];
    reviews: { id: string; rating: number; comment: string | null; customerName: string; serviceType: string; date: string; isPublic: boolean }[];
    // Days they have marked as not available, from today on.
    offDays: string[];
}

const OPEN = ["NEW", "CONFIRMED", "ARRIVING", "WORKING", "DELAYED"] as const;

type Row = { id: string; bookingRef: string; status: BookingStatusValue; date: Date; time: string; serviceType: string; applianceCategory: ApplianceCategoryValue; town: string; customerName: string; price: number; amountCollected: number | null; reassignRequestedAt: Date | null };

const toJob = (b: Row): ProfileJob => ({
    id: b.id,
    bookingRef: b.bookingRef,
    status: b.status,
    date: istDateString(b.date),
    time: b.time,
    serviceType: b.serviceType,
    applianceCategory: b.applianceCategory,
    town: b.town,
    customerName: b.customerName,
    price: b.price,
    amountCollected: b.amountCollected,
    reassignRequested: !!b.reassignRequestedAt,
});

const select = { id: true, bookingRef: true, status: true, date: true, time: true, serviceType: true, applianceCategory: true, town: true, customerName: true, price: true, amountCollected: true, reassignRequestedAt: true } as const;

// Everything about one technician on one page. A technician outside the admin's stores does not exist for them.
export async function getTechnicianProfile(scope: AdminScope, id: string): Promise<TechnicianProfile | null> {
    const technician = await getTechnician(scope, id);
    if (!technician) return null;

    const month = monthRange(currentMonth());
    const today = dbDay(istDateString());

    const [raw, jobsDone, openJobs, monthAgg, monthCommission, balance, reviews, off, idRow] = await Promise.all([
        db.booking.findMany({ where: { technicianId: id }, select, orderBy: { date: "desc" }, take: 60 }),
        db.booking.count({ where: { technicianId: id, status: "COMPLETED" } }),
        db.booking.count({ where: { technicianId: id, status: { in: [...OPEN] } } }),
        db.booking.aggregate({ _sum: { amountCollected: true }, _count: { _all: true }, where: { technicianId: id, status: "COMPLETED", completedAt: month ? { gte: month.start!, lt: month.end! } : undefined } }),
        db.ledgerEntry.aggregate({ _sum: { amount: true }, where: { technicianId: id, ...storeOnlyWhere(scope), type: { in: ["COMMISSION_OWED", "ADJUSTMENT"] }, createdAt: month ? { gte: month.start!, lt: month.end! } : undefined } }),
        getTechnicianBalance(id),
        db.review.findMany({ where: { technicianId: id }, orderBy: { createdAt: "desc" }, take: 10, include: { booking: { select: { serviceType: true } } } }),
        db.technicianUnavailability.findMany({ where: { technicianId: id, date: { gte: today } }, select: { date: true }, orderBy: { date: "asc" } }),
        db.technician.findUnique({ where: { id }, select: { idImageUrl: true } }),
    ]);

    const rows = raw as Row[];
    const open = rows.filter((r) => (OPEN as readonly string[]).includes(r.status));
    const upcoming = open.map(toJob).sort((a, b) => a.date.localeCompare(b.date) || slotToMinutes(a.time) - slotToMinutes(b.time));
    const recent = rows.filter((r) => !(OPEN as readonly string[]).includes(r.status)).map(toJob).slice(0, 15);

    return {
        technician,
        hasIdProof: !!idRow?.idImageUrl,
        storeId: technician.storeId,
        stats: {
            jobsDone,
            openJobs,
            monthJobs: monthAgg._count._all,
            monthCollected: monthAgg._sum.amountCollected ?? 0,
            monthCommission: round2(Number(monthCommission._sum.amount ?? 0)),
            balance,
        },
        upcoming,
        recent,
        reviews: reviews.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, customerName: r.customerName, serviceType: r.booking.serviceType, date: istDateString(r.createdAt), isPublic: r.isPublic })),
        offDays: off.map((o) => fromDbDay(o.date)),
    };
}
