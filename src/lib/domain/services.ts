import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import { BulkServiceSchema, ServiceCreateSchema, ServiceInputSchema, ServicePatchSchema, bulkPrice } from "@/schema/service";
import type { ServiceItem } from "@/types/service";
import { fail, ok, type Result } from "./result";

const select = {
    id: true,
    applianceCategory: true,
    applianceSubType: true,
    serviceType: true,
    price: true,
    image: true,
    desc: true,
    warrantyDurationDays: true,
    isActive: true,
} as const;

const order = [{ applianceCategory: "asc" }, { serviceType: "asc" }, { applianceSubType: "asc" }] as const;

export interface AdminServiceItem extends ServiceItem {
    bookingCount: number;
}

export async function listServices(options: { activeOnly?: boolean; category?: ApplianceCategoryValue } = {}): Promise<ServiceItem[]> {
    const { activeOnly = true, category } = options;
    return db.service.findMany({
        where: { ...(activeOnly ? { isActive: true } : {}), ...(category ? { applianceCategory: category } : {}) },
        select,
        orderBy: [...order],
    });
}

// Everything, with how many bookings each service has had, for the admin list.
export async function listServicesForAdmin(): Promise<AdminServiceItem[]> {
    const rows = await db.service.findMany({ select: { ...select, _count: { select: { bookings: true } } }, orderBy: [...order] });
    return rows.map(({ _count, ...s }) => ({ ...s, bookingCount: _count.bookings }));
}

export async function getService(id: string): Promise<ServiceItem | null> {
    return db.service.findUnique({ where: { id }, select });
}

const image = (v: string) => (v === "" ? null : v);
const isUniqueError = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

// One row per chosen type. Nothing is created if any of them already exists.
export async function createServices(adminId: string, raw: unknown): Promise<Result<ServiceItem[]>> {
    const parsed = ServiceCreateSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const v = parsed.data;
    const subTypes = Array.from(new Set(v.applianceSubTypes));

    const existing = await db.service.findMany({
        where: { applianceCategory: v.applianceCategory, serviceType: v.serviceType, applianceSubType: { in: subTypes } },
        select: { applianceSubType: true },
    });
    if (existing.length) {
        return fail("duplicate", `"${v.serviceType}" already exists for ${existing.map((e) => e.applianceSubType).join(", ")}`);
    }

    try {
        const created = await db.$transaction(
            subTypes.map((applianceSubType) =>
                db.service.create({
                    data: {
                        applianceCategory: v.applianceCategory,
                        applianceSubType,
                        serviceType: v.serviceType,
                        price: v.price,
                        warrantyDurationDays: v.warrantyDurationDays,
                        image: image(v.image),
                        desc: v.desc,
                        isActive: v.isActive,
                    },
                    select,
                })
            )
        );
        for (const s of created) await logAudit({ actorType: "admin", actorId: adminId, action: "service.create", entity: "Service", entityId: s.id, after: s });
        return ok(created);
    } catch (error) {
        if (isUniqueError(error)) return fail("duplicate", "This service already exists for that appliance and type");
        throw error;
    }
}

export async function updateService(id: string, adminId: string, raw: unknown): Promise<Result<ServiceItem>> {
    const parsed = ServiceInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const v = parsed.data;

    const before = await getService(id);
    if (!before) return fail("not_found", "Service not found");

    try {
        const service = await db.service.update({
            where: { id },
            data: {
                applianceCategory: v.applianceCategory,
                applianceSubType: v.applianceSubType,
                serviceType: v.serviceType,
                price: v.price,
                warrantyDurationDays: v.warrantyDurationDays,
                image: image(v.image),
                desc: v.desc,
                isActive: v.isActive,
            },
            select,
        });
        await logAudit({ actorType: "admin", actorId: adminId, action: "service.update", entity: "Service", entityId: id, before, after: service });
        return ok(service);
    } catch (error) {
        if (isUniqueError(error)) return fail("duplicate", "This service already exists for that appliance and type");
        throw error;
    }
}

// Price, guarantee days or visibility only. Used by the switches and the quick price edit.
export async function patchService(id: string, adminId: string, raw: unknown): Promise<Result<ServiceItem>> {
    const parsed = ServicePatchSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const before = await getService(id);
    if (!before) return fail("not_found", "Service not found");

    const service = await db.service.update({ where: { id }, data: parsed.data, select });
    await logAudit({ actorType: "admin", actorId: adminId, action: "service.update", entity: "Service", entityId: id, before, after: service });
    return ok(service);
}

export async function bulkUpdateServices(adminId: string, raw: unknown): Promise<Result<{ updated: number }>> {
    const parsed = BulkServiceSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const v = parsed.data;

    const rows = await db.service.findMany({ where: { id: { in: v.ids } }, select: { id: true, price: true, isActive: true } });
    if (rows.length === 0) return fail("not_found", "Those services were not found");

    await db.$transaction(
        rows.map((r) => {
            const data = v.action === "show" ? { isActive: true } : v.action === "hide" ? { isActive: false } : { price: bulkPrice(r.price, v.action, v.value) };
            return db.service.update({ where: { id: r.id }, data });
        })
    );
    await logAudit({
        actorType: "admin",
        actorId: adminId,
        action: `service.bulk.${v.action}`,
        entity: "Service",
        entityId: rows.map((r) => r.id).join(","),
        before: rows,
        after: v.action === "show" || v.action === "hide" ? { isActive: v.action === "show" } : { action: v.action, value: v.value },
    });
    return ok({ updated: rows.length });
}

// A service that has been booked stays, so old bookings keep their link. Hide it instead.
export async function deleteService(id: string, adminId: string): Promise<Result<null>> {
    const before = await getService(id);
    if (!before) return fail("not_found", "Service not found");

    const bookings = await db.booking.count({ where: { serviceId: id } });
    if (bookings > 0) {
        return fail("in_use", `This service has ${bookings} ${bookings === 1 ? "booking" : "bookings"}, so it cannot be deleted. Hide it instead.`);
    }

    await db.service.delete({ where: { id } });
    await logAudit({ actorType: "admin", actorId: adminId, action: "service.delete", entity: "Service", entityId: id, before });
    return ok(null);
}
