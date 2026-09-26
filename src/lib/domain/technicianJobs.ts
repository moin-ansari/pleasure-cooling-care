import { db } from "@/lib/db";
import { istDateString, slotToMinutes } from "@/lib/time";
import { TECHNICIAN_TRANSITIONS, type BookingStatusValue } from "@/constants/booking";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import { JobStatusUpdateSchema } from "@/schema/technicianJob";
import { commissionNote } from "./finance";
import { getStoreTerms } from "./stores";
import { splitCommission } from "@/lib/money";
import { recomputeTechnicianStats } from "./reviews";
import { notifyArriving, notifyCompleted, notifyDelayed } from "./notifications";
import { fail, ok, type Result } from "./result";

export interface JobListItem {
    id: string;
    bookingRef: string;
    status: BookingStatusValue;
    applianceCategory: ApplianceCategoryValue;
    applianceSubType: string;
    serviceType: string;
    customerName: string;
    town: string;
    district: string;
    date: string;
    time: string;
    price: number;
    confirmedArrivalAt: string | null;
    etaAt: string | null;
    isWarrantyRedo: boolean;
}

// Customer contact details are only included while the job is still open.
export interface JobDetail extends JobListItem {
    mobile: string | null;
    streetAddress: string | null;
    pincode: string | null;
    lat: number | null;
    lng: number | null;
    technicianNotes: string | null;
    laborAmount: number;
    partsAmount: number;
    amountCollected: number | null;
    completedAt: string | null;
    nextStatuses: BookingStatusValue[];
}

const OPEN: BookingStatusValue[] = ["CONFIRMED", "ARRIVING", "WORKING", "DELAYED"];

const include = { serviceArea: { select: { district: true } } } as const;

type BookingRow = Awaited<ReturnType<typeof loadRow>>;

function loadRow(technicianId: string, id: string) {
    return db.booking.findFirst({ where: { id, technicianId }, include });
}

function toListItem(b: NonNullable<BookingRow>): JobListItem {
    return {
        id: b.id,
        bookingRef: b.bookingRef,
        status: b.status,
        applianceCategory: b.applianceCategory,
        applianceSubType: b.applianceSubType,
        serviceType: b.serviceType,
        customerName: b.customerName,
        town: b.town,
        district: b.serviceArea.district,
        date: istDateString(b.date),
        time: b.time,
        price: b.price,
        confirmedArrivalAt: b.confirmedArrivalAt?.toISOString() ?? null,
        etaAt: b.etaAt?.toISOString() ?? null,
        isWarrantyRedo: !!b.warrantyClaimOfId,
    };
}

function toDetail(b: NonNullable<BookingRow>): JobDetail {
    const open = OPEN.includes(b.status);
    return {
        ...toListItem(b),
        mobile: open ? b.mobile : null,
        streetAddress: open ? b.streetAddress : null,
        pincode: open ? b.pincode : null,
        lat: open ? b.lat : null,
        lng: open ? b.lng : null,
        technicianNotes: b.technicianNotes,
        laborAmount: b.laborAmount,
        partsAmount: b.partsAmount,
        amountCollected: b.amountCollected,
        completedAt: b.completedAt?.toISOString() ?? null,
        nextStatuses: TECHNICIAN_TRANSITIONS[b.status],
    };
}

const byWhen = (a: JobListItem, b: JobListItem) =>
    a.date === b.date ? slotToMinutes(a.time) - slotToMinutes(b.time) : a.date.localeCompare(b.date);

export async function listJobs(technicianId: string): Promise<{ upcoming: JobListItem[]; ongoing: JobListItem[]; completed: JobListItem[] }> {
    const [open, completed] = await Promise.all([
        db.booking.findMany({ where: { technicianId, status: { in: OPEN } }, include }),
        db.booking.findMany({ where: { technicianId, status: "COMPLETED" }, include, orderBy: { completedAt: "desc" }, take: 20 }),
    ]);
    const items = open.map(toListItem).sort(byWhen);
    return {
        upcoming: items.filter((j) => j.status === "CONFIRMED"),
        ongoing: items.filter((j) => j.status !== "CONFIRMED"),
        completed: completed.map(toListItem),
    };
}

export async function getJob(technicianId: string, id: string): Promise<JobDetail | null> {
    const row = await loadRow(technicianId, id);
    return row ? toDetail(row) : null;
}

export async function updateJobStatus(technicianId: string, id: string, raw: unknown): Promise<Result<JobDetail>> {
    const parsed = JobStatusUpdateSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const update = parsed.data;

    const current = await loadRow(technicianId, id);
    if (!current) return fail("not_found", "Job not found");

    if (!TECHNICIAN_TRANSITIONS[current.status].includes(update.status)) {
        return fail("bad_transition", `This job is ${current.status.toLowerCase()} and cannot be changed to ${update.status.toLowerCase()}.`);
    }

    const now = new Date();
    let data: Record<string, unknown> = {};
    let note: string | null = null;
    let commission = 0;
    let ownerShare = 0;
    let inMainStore = true;
    let commissionText = "";

    if (update.status === "ARRIVING") {
        data = { etaAt: new Date(now.getTime() + update.etaMinutes * 60000) };
        note = `Arriving in about ${update.etaMinutes} minutes`;
    } else if (update.status === "DELAYED") {
        data = { technicianNotes: update.reason };
        note = update.reason;
    } else if (update.status === "COMPLETED") {
        const service = current.serviceId
            ? await db.service.findUnique({ where: { id: current.serviceId }, select: { warrantyDurationDays: true } })
            : null;
        const days = service?.warrantyDurationDays ?? 0;
        // The store's terms at this moment. A free guarantee re-service earns nothing.
        const terms = await getStoreTerms(current.storeId, !!current.warrantyClaimOfId);
        const split = splitCommission(update.laborAmount, terms);
        commission = split.technicianOwes;
        ownerShare = split.ownerShare;
        inMainStore = terms.isMain;
        commissionText = commissionNote(update.laborAmount, terms);
        data = {
            completedAt: now,
            laborAmount: update.laborAmount,
            partsAmount: update.partsAmount,
            amountCollected: update.amountCollected,
            // A free re-service does not start a new guarantee.
            warrantyExpiresAt: days > 0 && !current.warrantyClaimOfId ? new Date(now.getTime() + days * 86400000) : null,
            commissionRateApplied: terms.ratePercent.toFixed(2),
            commissionFlatApplied: terms.flatAmount.toFixed(2),
            ownerRateApplied: terms.ownerRatePercent.toFixed(2),
        };
    }

    const changed = await db.$transaction(async (tx) => {
        // The status is part of the filter, so two quick taps cannot apply the same step twice.
        const result = await tx.booking.updateMany({
            where: { id, technicianId, status: current.status },
            data: { status: update.status, ...data },
        });
        if (result.count === 0) return false;

        await tx.bookingStatusHistory.create({
            data: { bookingId: id, fromStatus: current.status, toStatus: update.status, changedByType: "technician", changedById: technicianId, note },
        });
        if (update.status === "COMPLETED") {
            await tx.technician.update({ where: { id: technicianId }, data: { jobsCompletedCount: { increment: 1 } } });
            await recomputeTechnicianStats(tx, technicianId);
            if (commission > 0) {
                await tx.ledgerEntry.create({
                    data: { technicianId, storeId: current.storeId, bookingId: id, type: "COMMISSION_OWED", amount: commission.toFixed(2), note: commissionText },
                });
            }
            // A co-admin's store also owes the owner their share. In the owner's own store there is no second step.
            if (!inMainStore && ownerShare > 0) {
                await tx.storeLedgerEntry.create({
                    data: { storeId: current.storeId, bookingId: id, type: "OWNER_SHARE_OWED", amount: ownerShare.toFixed(2), note: `Owner share of ${current.bookingRef}` },
                });
            }
        }
        return true;
    });

    if (!changed) return fail("conflict", "This job was just updated. Please refresh.");

    if (update.status === "ARRIVING") await notifyArriving(id);
    else if (update.status === "DELAYED") await notifyDelayed(id);
    else if (update.status === "COMPLETED") await notifyCompleted(id);

    const fresh = await loadRow(technicianId, id);
    return ok(toDetail(fresh!));
}
