import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AdminScope } from "@/lib/scope";
import { getDataFromToken } from "./getDataFromToken";

export const CITY_HEADER = "x-admin-city";

// The admin behind a valid session, with what they may see. The token is verified before any database work so
// unauthenticated requests never reach the database. Switched-off admins and co-admins without a store get nothing.
export async function getAdminScope(request: NextRequest): Promise<AdminScope | null> {
    try {
        const userId = getDataFromToken(request);
        const user = await db.adminUser.findUnique({
            where: { id: userId },
            select: { id: true, isAdmin: true, isActive: true, role: true, storeId: true, name: true, email: true, store: { select: { isActive: true } } },
        });
        if (!user || !user.isAdmin || !user.isActive) return null;
        if (user.role === "CO_ADMIN" && (!user.storeId || !user.store?.isActive)) return null;

        const storeIds = user.role === "OWNER" ? null : [user.storeId!];

        // The city switcher. An unknown city, or one outside the admin's stores, is ignored.
        let cityId: string | null = null;
        const wanted = request.headers.get(CITY_HEADER);
        if (wanted) {
            const area = await db.serviceArea.findUnique({ where: { id: wanted }, select: { id: true, storeId: true } });
            if (area && (storeIds === null || storeIds.includes(area.storeId))) cityId = area.id;
        }

        return { adminId: user.id, role: user.role, name: user.name || user.email, storeIds, cityId };
    } catch {
        // invalid, expired or missing token
        return null;
    }
}

// Kept for routes that only need to know an admin is signed in.
export async function getAdminId(request: NextRequest): Promise<string | null> {
    return (await getAdminScope(request))?.adminId ?? null;
}

export function unauthorizedResponse() {
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
    return NextResponse.json({ status: "error", message: "Only the owner can do this" }, { status: 403 });
}

// Returns null when the request carries a valid admin session, otherwise a 401 response to return as-is.
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
    return (await getAdminId(request)) ? null : unauthorizedResponse();
}
