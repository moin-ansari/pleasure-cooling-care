import type { Prisma } from "@prisma/client";

// Who is asking, and which stores and city they may see. Every admin query is limited with these helpers,
// so a co-admin can never read or change another store's data.
export interface AdminScope {
    adminId: string;
    role: "OWNER" | "CO_ADMIN";
    name: string;
    // Empty for the owner (all stores), otherwise the stores this admin belongs to.
    storeIds: string[] | null;
    // A single city picked in the switcher, or null for everything the admin may see.
    cityId: string | null;
}

export const isOwner = (scope: AdminScope): boolean => scope.role === "OWNER";

export const canAccessStore = (scope: AdminScope, storeId: string): boolean => scope.storeIds === null || scope.storeIds.includes(storeId);

const inStores = (scope: AdminScope) => (scope.storeIds ? { storeId: { in: scope.storeIds } } : {});

export const bookingWhere = (scope: AdminScope): Prisma.BookingWhereInput => ({
    ...inStores(scope),
    ...(scope.cityId ? { serviceAreaId: scope.cityId } : {}),
});

export const technicianWhere = (scope: AdminScope): Prisma.TechnicianWhereInput => ({
    ...inStores(scope),
    ...(scope.cityId ? { serviceAreas: { some: { id: scope.cityId } } } : {}),
});

// Ledger entries, expenses and messages carry a store id but no city.
export const storeOnlyWhere = (scope: AdminScope) => inStores(scope);

export const areaWhere = (scope: AdminScope): Prisma.ServiceAreaWhereInput => (scope.storeIds ? { storeId: { in: scope.storeIds } } : {});
