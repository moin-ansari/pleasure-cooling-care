import bcryptjs from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import type { CreateTechnicianInput, UpdateTechnicianInput } from "@/schema/technician";
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
    joinedAt: string;
}

const NOT_FINISHED = ["NEW", "CONFIRMED", "ARRIVING", "WORKING", "DELAYED"] as const;

export async function listTechnicians(): Promise<TechnicianListItem[]> {
    const [technicians, active] = await Promise.all([
        db.technician.findMany({
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
            include: { serviceAreas: { select: { district: true } } },
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
    }));
}

export async function getTechnician(id: string): Promise<TechnicianDetail | null> {
    const t = await db.technician.findUnique({ where: { id }, include: { serviceAreas: { select: { id: true } } } });
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
        rank: t.rank,
        jobsCompletedCount: t.jobsCompletedCount,
        averageRating: t.averageRating,
        ratingCount: t.ratingCount,
        isActive: t.isActive,
        isLocked: !!t.lockedUntil && t.lockedUntil > new Date(),
        joinedAt: t.joinedAt.toISOString(),
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
    };
}

export async function createTechnician(input: CreateTechnicianInput): Promise<string> {
    const technician = await db.technician.create({
        data: {
            ...profileData(input),
            pinHash: await bcryptjs.hash(input.pin, 10),
            serviceAreas: { connect: input.serviceAreaIds.map((id) => ({ id })) },
        },
        select: { id: true },
    });
    return technician.id;
}

export async function updateTechnician(id: string, input: UpdateTechnicianInput): Promise<void> {
    await db.technician.update({
        where: { id },
        data: {
            ...profileData(input),
            serviceAreas: { set: input.serviceAreaIds.map((areaId) => ({ id: areaId })) },
            ...(input.newPin ? { pinHash: await bcryptjs.hash(input.newPin, 10) } : {}),
            ...(input.newPin || input.unlock ? { failedPinAttempts: 0, lockedUntil: null } : {}),
        },
    });
}

// Technicians with history cannot be removed; deactivate them instead.
export async function deleteTechnician(id: string): Promise<Result<null>> {
    // Bookings would only lose their technician on delete, erasing who did the work, so refuse here.
    if ((await db.booking.count({ where: { technicianId: id } })) > 0) {
        return fail("has_history", "This technician has jobs on record. Deactivate them instead of deleting.");
    }
    try {
        await db.technician.delete({ where: { id } });
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
    rank: TechnicianListItem["rank"];
    jobsCompletedCount: number;
    averageRating: number;
    ratingCount: number;
    experienceYears: number | null;
    specializations: ApplianceCategoryValue[];
    districts: string[];
}

export async function getTechnicianSelf(id: string): Promise<TechnicianSelf | null> {
    const t = await db.technician.findUnique({ where: { id }, include: { serviceAreas: { select: { district: true } } } });
    if (!t) return null;
    return {
        id: t.id,
        name: t.name,
        phone: t.phone,
        workEmail: t.workEmail,
        rank: t.rank,
        jobsCompletedCount: t.jobsCompletedCount,
        averageRating: t.averageRating,
        ratingCount: t.ratingCount,
        experienceYears: t.experienceYears,
        specializations: t.specializations,
        districts: t.serviceAreas.map((a) => a.district),
    };
}
