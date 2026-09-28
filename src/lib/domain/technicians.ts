import bcryptjs from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import type { CreateTechnicianInput, UpdateTechnicianInput } from "@/schema/technician";
import { nextRankProgress, type NextRank } from "@/lib/rank";
import { logAudit } from "@/lib/audit";
import { canAccessStore, isOwner, storeOnlyWhere, technicianWhere, type AdminScope } from "@/lib/scope";
import { getMainStoreId } from "./stores";
import { getTechnicianBalance } from "./finance";
import { getRankThresholds } from "./reviews";
import { fail, ok, type Result } from "./result";

export const MAX_PIN_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

// Compared against when the email is unknown so a missing account takes as long as a wrong PIN.
const DUMMY_HASH = bcryptjs.hashSync("no-such-technician-pin", 10);

export interface TechnicianListItem {
    id: string;
    name: string;
    phone: string;
    workEmail: string;
    rank: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";
    jobsCompletedCount: number;
    averageRating: number;
    ratingCount: number;
    isActive: boolean;
    isLocked: boolean;
    activeJobs: number;
    districts: string[];
    specializations: ApplianceCategoryValue[];
    storeId: string;
    storeName: string;
}

export interface TechnicianDetail extends Omit<TechnicianListItem, "districts" | "activeJobs"> {
    fatherName: string | null;
    photo: string | null;
    address: string | null;
    age: number | null;
    gender: "MALE" | "FEMALE" | "OTHER" | null;
    experienceYears: number | null;
    serviceAreaIds: string[];
    accountHolderName: string | null;
    accountNumber: string | null;
    ifsc: string | null;
    idType: string | null;
    idNumber: string | null;
    // Only whether a document is on file. The image itself is private and is read through its own route.
    hasIdProof: boolean;
    joinedAt: string;
    showOnWebsite: boolean;
}

const NOT_FINISHED = ["NEW", "CONFIRMED", "ARRIVING", "WORKING", "DELAYED"] as const;

export async function listTechnicians(scope: AdminScope): Promise<TechnicianListItem[]> {
    const [technicians, active] = await Promise.all([
        db.technician.findMany({
            where: technicianWhere(scope),
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
            include: { serviceAreas: { select: { district: true } }, store: { select: { name: true } } },
        }),
        db.booking.groupBy({
            by: ["technicianId"],
            where: { technicianId: { not: null }, status: { in: [...NOT_FINISHED] } },
            _count: { _all: true },
        }),
    ]);
    const activeByTechnician = new Map(active.map((a) => [a.technicianId, a._count._all]));
    const now = new Date();

    return technicians.map((t) => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        workEmail: t.workEmail,
        rank: t.rank,
        jobsCompletedCount: t.jobsCompletedCount,
        averageRating: t.averageRating,
        ratingCount: t.ratingCount,
        isActive: t.isActive,
        isLocked: !!t.lockedUntil && t.lockedUntil > now,
        activeJobs: activeByTechnician.get(t.id) ?? 0,
        districts: t.serviceAreas.map((a) => a.district),
        specializations: t.specializations,
        storeId: t.storeId,
        storeName: t.store.name,
    }));
}

// A technician outside the admin's stores does not exist for them.
export async function getTechnician(scope: AdminScope, id: string): Promise<TechnicianDetail | null> {
    const t = await db.technician.findFirst({ where: { id, ...storeOnlyWhere(scope) }, include: { serviceAreas: { select: { id: true } }, store: { select: { name: true } } } });
    if (!t) return null;
    return {
        id: t.id,
        name: t.name,
        fatherName: t.fatherName,
        photo: t.photo,
        phone: t.phone,
        workEmail: t.workEmail,
        address: t.address,
        age: t.age,
        gender: t.gender,
        experienceYears: t.experienceYears,
        specializations: t.specializations,
        serviceAreaIds: t.serviceAreas.map((a) => a.id),
        accountHolderName: t.accountHolderName,
        accountNumber: t.accountNumber,
        ifsc: t.ifsc,
        idType: t.idType,
        idNumber: t.idNumber,
        hasIdProof: !!t.idImageUrl,
        rank: t.rank,
        jobsCompletedCount: t.jobsCompletedCount,
        averageRating: t.averageRating,
        ratingCount: t.ratingCount,
        isActive: t.isActive,
        isLocked: !!t.lockedUntil && t.lockedUntil > new Date(),
        joinedAt: t.joinedAt.toISOString(),
        showOnWebsite: t.showOnWebsite,
        storeId: t.storeId,
        storeName: t.store.name,
    };
}

function profileData(input: CreateTechnicianInput | UpdateTechnicianInput) {
    return {
        name: input.name,
        fatherName: input.fatherName ?? null,
        photo: input.photo ?? null,
        phone: input.phone,
        workEmail: input.workEmail,
        address: input.address ?? null,
        age: input.age ?? null,
        gender: input.gender ?? null,
        experienceYears: input.experienceYears ?? null,
        specializations: input.specializations,
        accountHolderName: input.accountHolderName ?? null,
        accountNumber: input.accountNumber ?? null,
        ifsc: input.ifsc ?? null,
        idType: input.idType ?? null,
        idNumber: input.idNumber ?? null,
        isActive: input.isActive,
        showOnWebsite: input.showOnWebsite,
    };
}

// Which store a technician is being saved into, and whether the chosen districts belong to it.
async function resolveStore(scope: AdminScope, wanted: string | undefined, fallbackStoreId: string | null, areaIds: string[]): Promise<Result<string>> {
    let storeId: string;
    if (!isOwner(scope)) storeId = scope.storeIds![0];
    else storeId = wanted ?? fallbackStoreId ?? (await getMainStoreId());
    if (!canAccessStore(scope, storeId)) return fail("not_found", "Store not found");

    const store = await db.store.findFirst({ where: { id: storeId, isActive: true }, select: { id: true } });
    if (!store) return fail("not_found", "Store not found");

    const areas = await db.serviceArea.findMany({ where: { id: { in: areaIds } }, select: { id: true, storeId: true, district: true } });
    if (areas.length !== new Set(areaIds).size) return fail("invalid", "One of the selected districts no longer exists");
    const foreign = areas.filter((a) => a.storeId !== storeId);
    if (foreign.length) return fail("invalid", `${foreign.map((a) => a.district).join(", ")} ${foreign.length === 1 ? "does" : "do"} not belong to this store`);
    return ok(storeId);
}

const uniqueEmail = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function createTechnician(scope: AdminScope, input: CreateTechnicianInput): Promise<Result<string>> {
    const store = await resolveStore(scope, input.storeId, null, input.serviceAreaIds);
    if (!store.ok) return store;

    try {
        const technician = await db.technician.create({
            data: {
                ...profileData(input),
                storeId: store.data,
                pinHash: await bcryptjs.hash(input.pin, 10),
                serviceAreas: { connect: input.serviceAreaIds.map((id) => ({ id })) },
            },
            select: { id: true },
        });
        // The audit record never holds the PIN or bank details.
        await logAudit({ actorType: "admin", actorId: scope.adminId, action: "technician.create", entity: "Technician", entityId: technician.id, after: { name: input.name, workEmail: input.workEmail, storeId: store.data } });
        return ok(technician.id);
    } catch (error) {
        if (uniqueEmail(error)) return fail("duplicate", "A technician with this work email already exists");
        throw error;
    }
}

export async function updateTechnician(scope: AdminScope, id: string, input: UpdateTechnicianInput): Promise<Result<string>> {
    const before = await db.technician.findFirst({ where: { id, ...storeOnlyWhere(scope) } });
    if (!before) return fail("not_found", "Technician not found");

    // Only the owner can move a technician to another store, and only when nothing is left unsettled.
    const wanted = isOwner(scope) ? input.storeId ?? before.storeId : before.storeId;
    const store = await resolveStore(scope, wanted, before.storeId, input.serviceAreaIds);
    if (!store.ok) return store;
    if (store.data !== before.storeId) {
        if ((await db.booking.count({ where: { technicianId: id, status: { in: [...NOT_FINISHED] } } })) > 0) return fail("has_open_jobs", "Finish or reassign this technician's open jobs before moving them to another store");
        if ((await getTechnicianBalance(id)) !== 0) return fail("has_balance", "Settle this technician's balance with their current store before moving them");
    }

    try {
        await db.technician.update({
            where: { id },
            data: {
                ...profileData(input),
                storeId: store.data,
                serviceAreas: { set: input.serviceAreaIds.map((areaId) => ({ id: areaId })) },
                ...(input.newPin ? { pinHash: await bcryptjs.hash(input.newPin, 10) } : {}),
                ...(input.newPin || input.unlock ? { failedPinAttempts: 0, lockedUntil: null } : {}),
            },
        });
    } catch (error) {
        if (uniqueEmail(error)) return fail("duplicate", "A technician with this work email already exists");
        throw error;
    }

    const actions = ["technician.update"];
    if (input.newPin) actions.push("technician.pinReset");
    if (input.unlock) actions.push("technician.unlock");
    for (const action of actions) {
        await logAudit({
            actorType: "admin",
            actorId: scope.adminId,
            action,
            entity: "Technician",
            entityId: id,
            before: action === "technician.update" ? { name: before.name, workEmail: before.workEmail, isActive: before.isActive, storeId: before.storeId } : undefined,
            after: action === "technician.update" ? { name: input.name, workEmail: input.workEmail, isActive: input.isActive, storeId: store.data } : undefined,
        });
    }
    return ok(id);
}

// Technicians with history cannot be removed; deactivate them instead.
export async function deleteTechnician(scope: AdminScope, id: string): Promise<Result<null>> {
    const before = await db.technician.findFirst({ where: { id, ...storeOnlyWhere(scope) }, select: { name: true, workEmail: true } });
    if (!before) return fail("not_found", "Technician not found");

    // Bookings would only lose their technician on delete, erasing who did the work, so refuse here.
    if ((await db.booking.count({ where: { technicianId: id } })) > 0) {
        return fail("has_history", "This technician has jobs on record. Deactivate them instead of deleting.");
    }
    try {
        await db.technician.delete({ where: { id } });
        await logAudit({ actorType: "admin", actorId: scope.adminId, action: "technician.delete", entity: "Technician", entityId: id, before });
        return ok(null);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            return fail("has_history", "This technician has jobs or earnings on record. Deactivate them instead of deleting.");
        }
        throw error;
    }
}

export interface VerifiedTechnician {
    id: string;
    name: string;
    // Changes whenever the PIN changes, which signs out every existing session.
    pinVersion: string;
}

export const pinVersionOf = (pinHash: string) => pinHash.slice(-10);

export async function verifyTechnicianLogin(email: string, pin: string): Promise<Result<VerifiedTechnician>> {
    const technician = await db.technician.findUnique({ where: { workEmail: email } });

    if (!technician || !technician.isActive) {
        await bcryptjs.compare(pin, DUMMY_HASH);
        return fail("invalid", "Invalid email or PIN");
    }

    const now = new Date();
    if (technician.lockedUntil && technician.lockedUntil > now) {
        const minutes = Math.ceil((technician.lockedUntil.getTime() - now.getTime()) / 60000);
        return fail("locked", `Too many wrong attempts. Try again in ${minutes} minutes, or ask the office to unlock your account.`);
    }

    if (!(await bcryptjs.compare(pin, technician.pinHash))) {
        const updated = await db.technician.update({
            where: { id: technician.id },
            data: { failedPinAttempts: { increment: 1 } },
            select: { failedPinAttempts: true },
        });
        if (updated.failedPinAttempts >= MAX_PIN_ATTEMPTS) {
            await db.technician.update({
                where: { id: technician.id },
                data: { failedPinAttempts: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60000) },
            });
            return fail("locked", `Too many wrong attempts. Try again in ${LOCK_MINUTES} minutes, or ask the office to unlock your account.`);
        }
        return fail("invalid", "Invalid email or PIN");
    }

    if (technician.failedPinAttempts > 0 || technician.lockedUntil) {
        await db.technician.update({ where: { id: technician.id }, data: { failedPinAttempts: 0, lockedUntil: null } });
    }

    return ok({ id: technician.id, name: technician.name, pinVersion: pinVersionOf(technician.pinHash) });
}

export interface TechnicianSelf {
    id: string;
    name: string;
    phone: string;
    workEmail: string;
    photo: string | null;
    rank: TechnicianListItem["rank"];
    jobsCompletedCount: number;
    averageRating: number;
    ratingCount: number;
    experienceYears: number | null;
    specializations: ApplianceCategoryValue[];
    districts: string[];
    nextRank: NextRank | null;
}

export async function getTechnicianSelf(id: string): Promise<TechnicianSelf | null> {
    const t = await db.technician.findUnique({ where: { id }, include: { serviceAreas: { select: { district: true } } } });
    if (!t) return null;
    const thresholds = await getRankThresholds();
    return {
        id: t.id,
        name: t.name,
        phone: t.phone,
        workEmail: t.workEmail,
        photo: t.photo,
        rank: t.rank,
        jobsCompletedCount: t.jobsCompletedCount,
        averageRating: t.averageRating,
        ratingCount: t.ratingCount,
        experienceYears: t.experienceYears,
        specializations: t.specializations,
        districts: t.serviceAreas.map((a) => a.district),
        nextRank: nextRankProgress(t.rank, t.jobsCompletedCount, t.averageRating, thresholds),
    };
}

// ---------- public (storefront) ----------

export interface PublicTechnician {
    id: string;
    name: string;
    photo: string | null;
    rank: TechnicianListItem["rank"];
    averageRating: number;
    ratingCount: number;
    experienceYears: number | null;
    specializations: ApplianceCategoryValue[];
    jobsCompletedCount: number;
}

// Shown on the website only when the admin has deliberately opted this technician in. Never selects phone,
// workEmail, address, age, gender, bank or ID fields — this is a public, unauthenticated read.
export async function listPublicTechnicians(limit = 12): Promise<PublicTechnician[]> {
    const rows = await db.technician.findMany({
        where: { showOnWebsite: true, isActive: true },
        orderBy: [{ rank: "desc" }, { averageRating: "desc" }, { jobsCompletedCount: "desc" }],
        take: limit,
        select: {
            id: true,
            name: true,
            photo: true,
            rank: true,
            averageRating: true,
            ratingCount: true,
            experienceYears: true,
            specializations: true,
            jobsCompletedCount: true,
        },
    });
    return rows;
}
