import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { areaWhere, isOwner, type AdminScope } from "@/lib/scope";
import { ServiceAreaInputSchema } from "@/schema/serviceArea";
import { getMainStoreId } from "./stores";
import { fail, ok, type Result } from "./result";

export interface ServiceAreaItem {
    id: string;
    state: string;
    district: string;
    isActive: boolean;
}

const select = { id: true, state: true, district: true, isActive: true } as const;

export async function listServiceAreas(options: { activeOnly?: boolean } = {}): Promise<ServiceAreaItem[]> {
    const { activeOnly = true } = options;
    return db.serviceArea.findMany({
        where: activeOnly ? { isActive: true } : {},
        select,
        orderBy: [{ state: "asc" }, { district: "asc" }],
    });
}

// An open district, with the store that serves it. The store is for internal use and is never sent to customers.
export async function checkCoverage(serviceAreaId: string): Promise<(ServiceAreaItem & { storeId: string }) | null> {
    return db.serviceArea.findFirst({ where: { id: serviceAreaId, isActive: true, store: { isActive: true } }, select: { ...select, storeId: true } });
}

export interface AdminAreaItem extends ServiceAreaItem {
    storeId: string;
    storeName: string;
}

// Cities the admin may see: the owner sees all of them, a co-admin only their store's.
export async function listServiceAreasForAdmin(scope: AdminScope): Promise<AdminAreaItem[]> {
    const rows = await db.serviceArea.findMany({ where: areaWhere(scope), select: { ...select, storeId: true, store: { select: { name: true } } }, orderBy: [{ state: "asc" }, { district: "asc" }] });
    return rows.map(({ store, ...a }) => ({ ...a, storeName: store.name }));
}

// Owner only. A new city goes into the given store, or the main store when none is chosen.
export async function createServiceArea(scope: AdminScope, raw: unknown): Promise<Result<AdminAreaItem>> {
    if (!isOwner(scope)) return fail("forbidden", "Only the owner can do this");
    const parsed = ServiceAreaInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const storeId = parsed.data.storeId ?? (await getMainStoreId());
    const store = await db.store.findFirst({ where: { id: storeId, isActive: true }, select: { id: true } });
    if (!store) return fail("not_found", "Store not found");

    try {
        const area = await db.serviceArea.create({
            data: { state: parsed.data.state, district: parsed.data.district, isActive: parsed.data.isActive, storeId },
            select: { ...select, storeId: true, store: { select: { name: true } } },
        });
        await logAudit({ actorType: "admin", actorId: scope.adminId, action: "serviceArea.create", entity: "ServiceArea", entityId: area.id, after: { district: area.district, storeId } });
        const { store: s, ...rest } = area;
        return ok({ ...rest, storeName: s.name });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("duplicate", "This district is already in the list");
        throw error;
    }
}

export async function updateServiceArea(scope: AdminScope, id: string, raw: unknown): Promise<Result<ServiceAreaItem>> {
    if (!isOwner(scope)) return fail("forbidden", "Only the owner can do this");
    const parsed = ServiceAreaInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const before = await db.serviceArea.findUnique({ where: { id }, select });
    if (!before) return fail("not_found", "District not found");

    try {
        const area = await db.serviceArea.update({ where: { id }, data: { state: parsed.data.state, district: parsed.data.district, isActive: parsed.data.isActive }, select });
        await logAudit({ actorType: "admin", actorId: scope.adminId, action: "serviceArea.update", entity: "ServiceArea", entityId: id, before, after: area });
        return ok(area);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("duplicate", "This district is already in the list");
        throw error;
    }
}

export async function deleteServiceArea(scope: AdminScope, id: string): Promise<Result<null>> {
    if (!isOwner(scope)) return fail("forbidden", "Only the owner can do this");
    const before = await db.serviceArea.findUnique({ where: { id }, select });
    if (!before) return fail("not_found", "District not found");
    if ((await db.booking.count({ where: { serviceAreaId: id } })) > 0) return fail("in_use", "This district has bookings. Close it instead of deleting.");
    await db.serviceArea.delete({ where: { id } });
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "serviceArea.delete", entity: "ServiceArea", entityId: id, before });
    return ok(null);
}
