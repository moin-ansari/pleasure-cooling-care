import bcryptjs from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { round2, type StoreTerms } from "@/lib/money";
import { canAccessStore, isOwner, type AdminScope } from "@/lib/scope";
import { AssignCitySchema, CoAdminCreateSchema, CoAdminUpdateSchema, StoreAlertSchema, StoreInputSchema, StoreUpdateSchema } from "@/schema/stores";
import { fail, ok, type Result } from "./result";

const num = (d: Prisma.Decimal | null | undefined): number => (d ? Number(d) : 0);

export const MAIN_STORE_NAME = "Main store";

// ---------- money terms ----------

export interface TermsForJob extends StoreTerms {
    isMain: boolean;
}

// What a technician pays on a job in this store. A free guarantee re-service earns nothing.
export async function getStoreTerms(storeId: string, isWarrantyRedo = false): Promise<TermsForJob> {
    const s = await db.store.findUnique({ where: { id: storeId }, select: { isMain: true, technicianRatePercent: true, ownerRatePercent: true, flatAmount: true } });
    const isMain = s?.isMain ?? false;
    if (isWarrantyRedo || !s) return { ratePercent: 0, ownerRatePercent: 0, flatAmount: 0, isMain };
    const ratePercent = num(s.technicianRatePercent);
    // In the owner's own store the owner receives everything the technician pays.
    return { ratePercent, ownerRatePercent: isMain ? ratePercent : num(s.ownerRatePercent), flatAmount: num(s.flatAmount), isMain };
}

export async function getMainStoreId(): Promise<string> {
    const main = await db.store.findFirst({ where: { isMain: true }, select: { id: true } });
    if (!main) throw new Error("The main store is missing");
    return main.id;
}

// What the store owes the owner right now.
export async function getStoreBalance(storeId: string): Promise<number> {
    const sum = await db.storeLedgerEntry.aggregate({ _sum: { amount: true }, where: { storeId } });
    return round2(num(sum._sum.amount));
}

// ---------- reading ----------

export interface StoreItem {
    id: string;
    name: string;
    isMain: boolean;
    isActive: boolean;
    technicianRatePercent: number;
    ownerRatePercent: number;
    flatAmount: number;
    adminAlertPhone: string | null;
    cities: { id: string; district: string; state: string; isActive: boolean }[];
    admins: { id: string; name: string; email: string; phone: string | null; isActive: boolean }[];
    technicianCount: number;
    owesOwner: number;
}

export async function listStores(scope: AdminScope): Promise<StoreItem[]> {
    const rows = await db.store.findMany({
        where: scope.storeIds ? { id: { in: scope.storeIds } } : {},
        orderBy: [{ isMain: "desc" }, { name: "asc" }],
        include: {
            areas: { select: { id: true, district: true, state: true, isActive: true }, orderBy: { district: "asc" } },
            admins: { where: { role: "CO_ADMIN" }, select: { id: true, name: true, email: true, phone: true, isActive: true }, orderBy: { name: "asc" } },
            _count: { select: { technicians: true } },
        },
    });
    const balances = await db.storeLedgerEntry.groupBy({ by: ["storeId"], _sum: { amount: true } });
    const owes = new Map(balances.map((b) => [b.storeId, round2(num(b._sum.amount))]));

    return rows.map((s) => ({
        id: s.id,
        name: s.name,
        isMain: s.isMain,
        isActive: s.isActive,
        technicianRatePercent: num(s.technicianRatePercent),
        ownerRatePercent: s.isMain ? num(s.technicianRatePercent) : num(s.ownerRatePercent),
        flatAmount: num(s.flatAmount),
        adminAlertPhone: s.adminAlertPhone,
        cities: s.areas,
        admins: s.admins,
        technicianCount: s._count.technicians,
        owesOwner: s.isMain ? 0 : owes.get(s.id) ?? 0,
    }));
}

// ---------- owner: stores ----------

const forbidden = () => fail("forbidden", "Only the owner can do this");
const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function createStore(scope: AdminScope, raw: unknown): Promise<Result<{ id: string }>> {
    if (!isOwner(scope)) return forbidden();
    const parsed = StoreInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const v = parsed.data;

    try {
        const store = await db.store.create({
            data: { name: v.name, technicianRatePercent: v.technicianRatePercent.toFixed(2), ownerRatePercent: v.ownerRatePercent.toFixed(2), flatAmount: v.flatAmount.toFixed(2), adminAlertPhone: v.adminAlertPhone || null },
        });
        await logAudit({ actorType: "admin", actorId: scope.adminId, action: "store.create", entity: "Store", entityId: store.id, after: v });
        return ok({ id: store.id });
    } catch (error) {
        if (isUnique(error)) return fail("duplicate", "A store with this name already exists");
        throw error;
    }
}

export async function updateStore(scope: AdminScope, storeId: string, raw: unknown): Promise<Result<{ id: string }>> {
    if (!isOwner(scope)) return forbidden();
    const parsed = StoreUpdateSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const v = parsed.data;

    const before = await db.store.findUnique({ where: { id: storeId }, include: { _count: { select: { areas: true } } } });
    if (!before) return fail("not_found", "Store not found");
    if (before.isMain && !v.isActive) return fail("invalid", "The main store cannot be switched off");
    if (!v.isActive && before._count.areas > 0) return fail("has_cities", "Move this store's cities to another store before switching it off");

    try {
        await db.store.update({
            where: { id: storeId },
            data: {
                name: v.name,
                technicianRatePercent: v.technicianRatePercent.toFixed(2),
                // The owner's own store always passes the whole percentage to the owner.
                ownerRatePercent: (before.isMain ? v.technicianRatePercent : v.ownerRatePercent).toFixed(2),
                flatAmount: v.flatAmount.toFixed(2),
                adminAlertPhone: v.adminAlertPhone || null,
                isActive: v.isActive,
            },
        });
        await logAudit({
            actorType: "admin",
            actorId: scope.adminId,
            action: "store.update",
            entity: "Store",
            entityId: storeId,
            before: { name: before.name, technicianRatePercent: num(before.technicianRatePercent), ownerRatePercent: num(before.ownerRatePercent), flatAmount: num(before.flatAmount), isActive: before.isActive },
            after: v,
        });
        return ok({ id: storeId });
    } catch (error) {
        if (isUnique(error)) return fail("duplicate", "A store with this name already exists");
        throw error;
    }
}

// A co-admin may change only their own store's new-booking alert number.
export async function updateStoreAlertPhone(scope: AdminScope, storeId: string, raw: unknown): Promise<Result<{ adminAlertPhone: string | null }>> {
    if (!canAccessStore(scope, storeId)) return fail("not_found", "Store not found");
    const parsed = StoreAlertSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const store = await db.store.findUnique({ where: { id: storeId }, select: { adminAlertPhone: true } });
    if (!store) return fail("not_found", "Store not found");
    const phone = parsed.data.adminAlertPhone || null;
    await db.store.update({ where: { id: storeId }, data: { adminAlertPhone: phone } });
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "store.alertPhone", entity: "Store", entityId: storeId, before: { adminAlertPhone: store.adminAlertPhone }, after: { adminAlertPhone: phone } });
    return ok({ adminAlertPhone: phone });
}

// Moves a city into a store. New bookings from it belong to the new store. Bookings already made stay where they are.
// Technicians of the old store lose this city, because a technician only works in their own store's cities.
export async function assignCityToStore(scope: AdminScope, areaId: string, raw: unknown): Promise<Result<{ techniciansUpdated: number }>> {
    if (!isOwner(scope)) return forbidden();
    const parsed = AssignCitySchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const [area, store] = await Promise.all([db.serviceArea.findUnique({ where: { id: areaId } }), db.store.findFirst({ where: { id: parsed.data.storeId, isActive: true } })]);
    if (!area) return fail("not_found", "City not found");
    if (!store) return fail("not_found", "Store not found");
    if (area.storeId === store.id) return ok({ techniciansUpdated: 0 });

    const others = await db.technician.findMany({ where: { serviceAreas: { some: { id: areaId } }, storeId: { not: store.id } }, select: { id: true } });
    await db.$transaction([
        db.serviceArea.update({ where: { id: areaId }, data: { storeId: store.id } }),
        ...others.map((t) => db.technician.update({ where: { id: t.id }, data: { serviceAreas: { disconnect: { id: areaId } } } })),
    ]);
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "store.assignCity", entity: "ServiceArea", entityId: areaId, before: { storeId: area.storeId }, after: { storeId: store.id, techniciansUpdated: others.length } });
    return ok({ techniciansUpdated: others.length });
}

// ---------- owner: co-admins ----------

export async function createCoAdmin(scope: AdminScope, raw: unknown): Promise<Result<{ id: string }>> {
    if (!isOwner(scope)) return forbidden();
    const parsed = CoAdminCreateSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const v = parsed.data;

    const store = await db.store.findFirst({ where: { id: v.storeId, isActive: true } });
    if (!store) return fail("not_found", "Store not found");

    try {
        const admin = await db.adminUser.create({
            data: { email: v.email, name: v.name, phone: v.phone || null, password: await bcryptjs.hash(v.password, 10), isAdmin: true, role: "CO_ADMIN", storeId: store.id },
        });
        await logAudit({ actorType: "admin", actorId: scope.adminId, action: "coAdmin.create", entity: "AdminUser", entityId: admin.id, after: { email: v.email, name: v.name, storeId: store.id } });
        return ok({ id: admin.id });
    } catch (error) {
        if (isUnique(error)) return fail("duplicate", "An admin with this email already exists");
        throw error;
    }
}

export async function updateCoAdmin(scope: AdminScope, adminId: string, raw: unknown): Promise<Result<{ id: string }>> {
    if (!isOwner(scope)) return forbidden();
    const parsed = CoAdminUpdateSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const v = parsed.data;

    const before = await db.adminUser.findFirst({ where: { id: adminId, role: "CO_ADMIN" } });
    if (!before) return fail("not_found", "Co-admin not found");
    const store = await db.store.findFirst({ where: { id: v.storeId, isActive: true } });
    if (!store) return fail("not_found", "Store not found");

    await db.adminUser.update({
        where: { id: adminId },
        data: { name: v.name, phone: v.phone || null, isActive: v.isActive, storeId: store.id, ...(v.newPassword ? { password: await bcryptjs.hash(v.newPassword, 10) } : {}) },
    });
    await logAudit({
        actorType: "admin",
        actorId: scope.adminId,
        action: v.newPassword ? "coAdmin.resetPassword" : "coAdmin.update",
        entity: "AdminUser",
        entityId: adminId,
        before: { name: before.name, isActive: before.isActive, storeId: before.storeId },
        after: { name: v.name, isActive: v.isActive, storeId: store.id },
    });
    return ok({ id: adminId });
}
