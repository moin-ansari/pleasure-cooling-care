import { db } from "@/lib/db";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import type { ServiceInput } from "@/schema/service";
import type { ServiceItem } from "@/types/service";

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

export async function listServices(options: { activeOnly?: boolean; category?: ApplianceCategoryValue } = {}): Promise<ServiceItem[]> {
    const { activeOnly = true, category } = options;
    return db.service.findMany({
        where: { ...(activeOnly ? { isActive: true } : {}), ...(category ? { applianceCategory: category } : {}) },
        select,
        orderBy: [...order],
    });
}

export async function getService(id: string): Promise<ServiceItem | null> {
    return db.service.findUnique({ where: { id }, select });
}

export async function findActiveService(category: ApplianceCategoryValue, subType: string, serviceType: string) {
    return db.service.findFirst({
        where: {
            applianceCategory: category,
            applianceSubType: { equals: subType, mode: "insensitive" },
            serviceType,
            isActive: true,
        },
        select: { id: true, price: true, serviceType: true, applianceSubType: true, warrantyDurationDays: true },
    });
}

function toData(input: ServiceInput) {
    return {
        applianceCategory: input.applianceCategory,
        applianceSubType: input.applianceSubType,
        serviceType: input.serviceType,
        price: input.price,
        warrantyDurationDays: input.warrantyDurationDays,
        image: input.image === "" ? null : input.image,
        desc: input.desc,
        isActive: input.isActive,
    };
}

export async function createService(input: ServiceInput): Promise<ServiceItem> {
    return db.service.create({ data: toData(input), select });
}

export async function updateService(id: string, input: ServiceInput): Promise<ServiceItem> {
    return db.service.update({ where: { id }, data: toData(input), select });
}

export async function deleteService(id: string): Promise<void> {
    await db.service.delete({ where: { id } });
}
