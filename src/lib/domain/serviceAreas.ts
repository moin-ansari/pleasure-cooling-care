import { db } from "@/lib/db";

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

export async function checkCoverage(serviceAreaId: string): Promise<ServiceAreaItem | null> {
    return db.serviceArea.findFirst({ where: { id: serviceAreaId, isActive: true }, select });
}
