import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { addDaysToDateString, dbDay, fromDbDay, istDateString, istDateToUtc, slotToMinutes } from "@/lib/time";
import { technicianWhere, type AdminScope } from "@/lib/scope";
import { TIME_SLOTS } from "@/constants/booking";
import type { BookingStatusValue } from "@/constants/booking";
import { z } from "zod";
import { fail, ok, type Result } from "./result";

// A technician can mark days they cannot work, this many days ahead.
export const AVAILABILITY_DAYS = 14;

const SetAvailabilitySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a day"),
    available: z.boolean(),
});

const OPEN: BookingStatusValue[] = ["NEW", "CONFIRMED", "ARRIVING", "WORKING", "DELAYED"];

// ---------- the technician's own days ----------

export interface MyDay {
    date: string;
    off: boolean;
    jobs: number;
}

export async function getMyAvailability(technicianId: string): Promise<MyDay[]> {
    const today = istDateString();
    const last = addDaysToDateString(today, AVAILABILITY_DAYS - 1);
    const [off, jobs] = await Promise.all([
        db.technicianUnavailability.findMany({ where: { technicianId, date: { gte: dbDay(today), lte: dbDay(last) } }, select: { date: true } }),
        db.booking.groupBy({ by: ["date"], where: { technicianId, status: { in: OPEN }, date: { gte: istDateToUtc(today), lte: istDateToUtc(last) } }, _count: { _all: true } }),
    ]);
    const offSet = new Set(off.map((o) => fromDbDay(o.date)));
    const jobsOn = new Map(jobs.map((j) => [istDateString(j.date), j._count._all]));

    const days: MyDay[] = [];
    for (let i = 0; i < AVAILABILITY_DAYS; i++) {
        const date = addDaysToDateString(today, i);
        days.push({ date, off: offSet.has(date), jobs: jobsOn.get(date) ?? 0 });
    }
    return days;
}

// Marking a day off does not cancel jobs already planned for it. The technician is told, and the office sees both.
export async function setMyAvailability(technicianId: string, raw: unknown): Promise<Result<{ date: string; off: boolean; jobs: number }>> {
    const parsed = SetAvailabilitySchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const { date, available } = parsed.data;

    const today = istDateString();
    if (date < today || date > addDaysToDateString(today, AVAILABILITY_DAYS - 1)) return fail("invalid_date", `Choose a day in the next ${AVAILABILITY_DAYS} days`);

    const off = dbDay(date);
    if (available) await db.technicianUnavailability.deleteMany({ where: { technicianId, date: off } });
    else await db.technicianUnavailability.upsert({ where: { technicianId_date: { technicianId, date: off } }, update: {}, create: { technicianId, date: off } });

    const jobs = await db.booking.count({ where: { technicianId, date: istDateToUtc(date), status: { in: OPEN } } });
    await logAudit({ actorType: "technician", actorId: technicianId, action: available ? "technician.available" : "technician.unavailable", entity: "Technician", entityId: technicianId, after: { date } });
    return ok({ date, off: !available, jobs });
}

// ---------- the office's view: who is free ----------

export interface TeamAvailabilityJob {
    id: string;
    bookingRef: string;
    time: string;
    status: BookingStatusValue;
    serviceType: string;
    town: string;
}

export interface TeamAvailabilityItem {
    id: string;
    name: string;
    phone: string;
    storeName: string;
    state: "FREE" | "BUSY" | "OFF";
    jobs: TeamAvailabilityJob[];
    // Which of the day's time slots already have a job.
    takenSlots: string[];
}

export interface TeamAvailability {
    date: string;
    slots: string[];
    items: TeamAvailabilityItem[];
}

const ORDER = { FREE: 0, BUSY: 1, OFF: 2 } as const;

export async function getTeamAvailability(scope: AdminScope, requested?: string): Promise<TeamAvailability> {
    const today = istDateString();
    const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;
    const day = istDateToUtc(date);

    const technicians = await db.technician.findMany({
        where: { ...technicianWhere(scope), isActive: true },
        select: { id: true, name: true, phone: true, store: { select: { name: true } } },
        orderBy: { name: "asc" },
    });
    const ids = technicians.map((t) => t.id);
    const [off, jobs] = await Promise.all([
        ids.length ? db.technicianUnavailability.findMany({ where: { technicianId: { in: ids }, date: dbDay(date) }, select: { technicianId: true } }) : [],
        ids.length
            ? db.booking.findMany({
                  where: { technicianId: { in: ids }, date: day, status: { not: "CANCELLED" } },
                  select: { id: true, technicianId: true, bookingRef: true, time: true, status: true, serviceType: true, town: true },
              })
            : [],
    ]);
    const offSet = new Set(off.map((o) => o.technicianId));

    const items: TeamAvailabilityItem[] = technicians.map((t) => {
        const mine = jobs
            .filter((j) => j.technicianId === t.id)
            .sort((a, b) => slotToMinutes(a.time) - slotToMinutes(b.time))
            .map((j) => ({ id: j.id, bookingRef: j.bookingRef, time: j.time, status: j.status, serviceType: j.serviceType, town: j.town }));
        const isOff = offSet.has(t.id);
        return {
            id: t.id,
            name: t.name,
            phone: t.phone,
            storeName: t.store.name,
            state: isOff ? "OFF" : mine.length ? "BUSY" : "FREE",
            jobs: mine,
            takenSlots: Array.from(new Set(mine.map((j) => j.time))),
        };
    });

    items.sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.jobs.length - b.jobs.length || a.name.localeCompare(b.name));
    return { date, slots: [...TIME_SLOTS], items };
}
