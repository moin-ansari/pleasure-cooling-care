import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BUSINESS } from "@/constants/business";
import { MAX_CUSTOMER_SMS_PER_DAY, SMS_TEMPLATES, renderSms, type SmsTemplateKey } from "@/constants/sms";
import { sendSms, smsIsConfigured, type SmsResult } from "@/lib/sms/msg91";
import { absoluteUrl } from "@/lib/site";
import { formatIst, formatIstDay } from "@/lib/time";
import { normalizeIndianMobile } from "@/lib/phone";
import { fail, ok, type Result } from "./result";

const PAGE_SIZE = 25;

const bookingInclude = {
    serviceArea: { select: { district: true } },
    technician: { select: { id: true, name: true, phone: true } },
} as const;

type BookingForSms = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
const clock = (date: Date) => date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

async function loadBooking(bookingId: string): Promise<BookingForSms | null> {
    return db.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });
}

export async function getAdminAlertPhone(): Promise<string | null> {
    const settings = await db.settings.findUnique({ where: { id: 1 }, select: { adminAlertPhone: true } });
    return settings?.adminAlertPhone || process.env.ADMIN_ALERT_PHONE?.trim() || null;
}

interface Dispatch {
    template: SmsTemplateKey;
    to: string;
    vars: string[];
    bookingId?: string;
}

// Sends one message and records exactly what happened. Never throws, so a messaging problem cannot break a booking action.
async function dispatch({ template, to, vars, bookingId }: Dispatch): Promise<void> {
    try {
        let result: SmsResult;
        if (SMS_TEMPLATES[template].recipient === "customer" && (await recentCustomerCount(to)) >= MAX_CUSTOMER_SMS_PER_DAY) {
            result = { status: "SKIPPED", response: "Daily message limit reached for this number" };
        } else {
            result = await sendSms(template, to, vars);
        }

        await db.notificationLog.create({
            data: {
                bookingId,
                channel: "SMS",
                to,
                template,
                status: result.status,
                providerResponse: result.response.slice(0, 500),
                body: renderSms(template, vars),
                vars,
            },
        });
    } catch (error) {
        console.error("notification failed", template, error);
    }
}

async function recentCustomerCount(to: string): Promise<number> {
    return db.notificationLog.count({
        where: { to, status: "SENT", createdAt: { gte: new Date(Date.now() - 24 * 3600e3) }, template: { in: customerTemplates } },
    });
}

const customerTemplates = (Object.keys(SMS_TEMPLATES) as SmsTemplateKey[]).filter((k) => SMS_TEMPLATES[k].recipient === "customer");

async function safely(label: string, work: () => Promise<void>): Promise<void> {
    try {
        await work();
    } catch (error) {
        console.error(`notification step failed: ${label}`, error);
    }
}

const requestedWhen = (b: BookingForSms) => `${formatIstDay(b.date)}, ${b.time}`;
const trackUrl = () => absoluteUrl("/track");

export async function notifyBookingReceived(bookingId: string): Promise<void> {
    await safely("received", async () => {
        const b = await loadBooking(bookingId);
        if (!b) return;
        const adminPhone = await getAdminAlertPhone();
        await Promise.all([
            dispatch({ template: "BOOKING_RECEIVED", to: b.mobile, bookingId, vars: [firstName(b.customerName), b.bookingRef, b.serviceType, requestedWhen(b), trackUrl()] }),
            adminPhone
                ? dispatch({ template: "ADMIN_NEW_BOOKING", to: adminPhone, bookingId, vars: [b.bookingRef, b.serviceType, b.serviceArea.district, firstName(b.customerName), absoluteUrl("/admin/bookings")] })
                : Promise.resolve(),
        ]);
    });
}

// The customer hears the confirmation and the technician hears about the job. A technician who lost the job is told too.
export async function notifyAssigned(bookingId: string, previousTechnicianId: string | null): Promise<void> {
    await safely("assigned", async () => {
        const b = await loadBooking(bookingId);
        if (!b?.technician) return;
        const arrival = b.confirmedArrivalAt ? formatIst(b.confirmedArrivalAt) : requestedWhen(b);

        const jobs: Promise<void>[] = [
            dispatch({ template: "BOOKING_CONFIRMED", to: b.mobile, bookingId, vars: [firstName(b.customerName), b.bookingRef, b.technician.name, arrival, trackUrl()] }),
            dispatch({ template: "TECHNICIAN_ASSIGNED", to: b.technician.phone, bookingId, vars: [b.bookingRef, b.serviceType, b.town, arrival, absoluteUrl("/technician")] }),
        ];
        if (previousTechnicianId && previousTechnicianId !== b.technician.id) {
            const previous = await db.technician.findUnique({ where: { id: previousTechnicianId }, select: { phone: true } });
            if (previous) jobs.push(dispatch({ template: "TECHNICIAN_REMOVED", to: previous.phone, bookingId, vars: [b.bookingRef, absoluteUrl("/technician")] }));
        }
        await Promise.all(jobs);
    });
}

export async function notifyArriving(bookingId: string): Promise<void> {
    await safely("arriving", async () => {
        const b = await loadBooking(bookingId);
        if (!b?.technician) return;
        const eta = b.etaAt ? clock(b.etaAt) : "shortly";
        await dispatch({ template: "TECHNICIAN_ARRIVING", to: b.mobile, bookingId, vars: [firstName(b.customerName), b.technician.name, b.bookingRef, eta] });
    });
}

export async function notifyDelayed(bookingId: string): Promise<void> {
    await safely("delayed", async () => {
        const b = await loadBooking(bookingId);
        if (!b) return;
        await dispatch({ template: "BOOKING_DELAYED", to: b.mobile, bookingId, vars: [firstName(b.customerName), b.bookingRef, BUSINESS.phone] });
    });
}

export async function notifyCompleted(bookingId: string): Promise<void> {
    await safely("completed", async () => {
        const b = await loadBooking(bookingId);
        if (!b) return;
        await dispatch({ template: "BOOKING_COMPLETED", to: b.mobile, bookingId, vars: [firstName(b.customerName), b.bookingRef, String(b.amountCollected ?? b.price), trackUrl()] });
    });
}

// Whoever cancelled it, the customer gets confirmation and an assigned technician is told to stand down.
export async function notifyCancelled(bookingId: string): Promise<void> {
    await safely("cancelled", async () => {
        const b = await loadBooking(bookingId);
        if (!b) return;
        const jobs: Promise<void>[] = [
            dispatch({ template: "BOOKING_CANCELLED", to: b.mobile, bookingId, vars: [firstName(b.customerName), b.bookingRef, absoluteUrl("/home"), BUSINESS.phone] }),
        ];
        if (b.technician) {
            jobs.push(dispatch({ template: "TECHNICIAN_REMOVED", to: b.technician.phone, bookingId, vars: [b.bookingRef, absoluteUrl("/technician")] }));
        }
        await Promise.all(jobs);
    });
}

export async function notifyPriceChanged(bookingId: string, oldPrice: number): Promise<void> {
    await safely("price", async () => {
        const b = await loadBooking(bookingId);
        if (!b) return;
        await dispatch({ template: "PRICE_CHANGED", to: b.mobile, bookingId, vars: [firstName(b.customerName), b.bookingRef, String(oldPrice), String(b.price), BUSINESS.phone] });
    });
}

export async function notifyWarrantyClaim(claimId: string): Promise<void> {
    await safely("claim", async () => {
        const claim = await db.warrantyClaim.findUnique({ where: { id: claimId }, include: { originalBooking: true } });
        const adminPhone = await getAdminAlertPhone();
        if (!claim || !adminPhone) return;
        const b = claim.originalBooking;
        await dispatch({ template: "ADMIN_WARRANTY_CLAIM", to: adminPhone, bookingId: b.id, vars: [b.bookingRef, firstName(b.customerName), absoluteUrl("/admin/warranty")] });
    });
}

// Customer hears the approval, and the technician gets the free job like any other assignment.
export async function notifyWarrantyApproved(claimId: string): Promise<void> {
    await safely("claim-approved", async () => {
        const claim = await db.warrantyClaim.findUnique({ where: { id: claimId }, include: { originalBooking: true } });
        if (!claim?.createdBookingId) return;
        const redo = await loadBooking(claim.createdBookingId);
        if (!redo?.technician) return;
        const arrival = redo.confirmedArrivalAt ? formatIst(redo.confirmedArrivalAt) : requestedWhen(redo);
        await Promise.all([
            dispatch({
                template: "WARRANTY_APPROVED",
                to: redo.mobile,
                bookingId: redo.id,
                vars: [firstName(redo.customerName), claim.originalBooking.bookingRef, redo.bookingRef, redo.technician.name, arrival, trackUrl()],
            }),
            dispatch({ template: "TECHNICIAN_ASSIGNED", to: redo.technician.phone, bookingId: redo.id, vars: [redo.bookingRef, redo.serviceType, redo.town, arrival, absoluteUrl("/technician")] }),
        ]);
    });
}

export async function notifyWarrantyRejected(claimId: string): Promise<void> {
    await safely("claim-rejected", async () => {
        const claim = await db.warrantyClaim.findUnique({ where: { id: claimId }, include: { originalBooking: true } });
        if (!claim) return;
        const b = claim.originalBooking;
        await dispatch({ template: "WARRANTY_REJECTED", to: b.mobile, bookingId: b.id, vars: [firstName(b.customerName), b.bookingRef, claim.rejectReason ?? "Not covered", BUSINESS.phone] });
    });
}

export interface NotificationItem {
    id: string;
    createdAt: string;
    updatedAt: string;
    to: string;
    template: SmsTemplateKey;
    label: string;
    recipient: "customer" | "technician" | "admin";
    status: "SENT" | "FAILED" | "SKIPPED";
    providerResponse: string | null;
    body: string | null;
    attempts: number;
    bookingId: string | null;
    bookingRef: string | null;
}

export interface NotificationList {
    items: NotificationItem[];
    counts: { all: number; SENT: number; FAILED: number; SKIPPED: number };
    page: number;
    pageCount: number;
    smsConfigured: boolean;
    adminAlertPhone: string | null;
}

export async function listNotifications(options: { status?: "SENT" | "FAILED" | "SKIPPED"; page?: number }): Promise<NotificationList> {
    const page = Math.max(1, options.page ?? 1);
    const where: Prisma.NotificationLogWhereInput = options.status ? { status: options.status } : {};

    const [rows, total, grouped, adminAlertPhone] = await Promise.all([
        db.notificationLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
        db.notificationLog.count({ where }),
        db.notificationLog.groupBy({ by: ["status"], _count: { _all: true } }),
        getAdminAlertPhone(),
    ]);

    const ids = Array.from(new Set(rows.map((r) => r.bookingId).filter((v): v is string => !!v)));
    const bookings = ids.length ? await db.booking.findMany({ where: { id: { in: ids } }, select: { id: true, bookingRef: true } }) : [];
    const refOf = new Map(bookings.map((b) => [b.id, b.bookingRef]));
    const count = (s: string) => grouped.find((g) => g.status === s)?._count._all ?? 0;

    return {
        items: rows.map((r) => {
            const template = r.template as SmsTemplateKey;
            const known = SMS_TEMPLATES[template];
            return {
                id: r.id,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
                to: r.to,
                template,
                label: known?.label ?? r.template,
                recipient: known?.recipient ?? "customer",
                status: r.status,
                providerResponse: r.providerResponse,
                body: r.body,
                attempts: r.attempts,
                bookingId: r.bookingId,
                bookingRef: r.bookingId ? refOf.get(r.bookingId) ?? null : null,
            };
        }),
        counts: { all: count("SENT") + count("FAILED") + count("SKIPPED"), SENT: count("SENT"), FAILED: count("FAILED"), SKIPPED: count("SKIPPED") },
        page,
        pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        smsConfigured: smsIsConfigured(),
        adminAlertPhone,
    };
}

// Tries a failed or skipped message again with the same recipient and values.
export async function resendNotification(id: string): Promise<Result<NotificationItem["status"]>> {
    const log = await db.notificationLog.findUnique({ where: { id } });
    if (!log) return fail("not_found", "Message not found");
    if (log.status === "SENT") return fail("already_sent", "This message was already sent");

    const template = log.template as SmsTemplateKey;
    if (!SMS_TEMPLATES[template]) return fail("unknown_template", "This message type is no longer supported");

    const values = Array.isArray(log.vars) ? (log.vars as unknown[]).map(String) : [];
    const result = await sendSms(template, log.to, values);

    await db.notificationLog.update({
        where: { id },
        data: { status: result.status, providerResponse: result.response.slice(0, 500), attempts: { increment: 1 } },
    });
    return ok(result.status);
}

export async function setAdminAlertPhone(raw: string): Promise<Result<string | null>> {
    const phone = normalizeIndianMobile(raw);
    if (raw.trim() !== "" && !/^[6-9]\d{9}$/.test(phone)) return fail("invalid", "Enter a valid 10 digit mobile number, or leave it empty to turn alerts off");

    const value = raw.trim() === "" ? null : phone;
    await db.settings.upsert({ where: { id: 1 }, update: { adminAlertPhone: value }, create: { id: 1, adminAlertPhone: value } });
    return ok(value);
}
