import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDataFromToken } from "./getDataFromToken";

// Returns the admin's id for a valid admin session, otherwise null.
// The token is verified before any database work so unauthenticated requests never reach the database.
export async function getAdminId(request: NextRequest): Promise<string | null> {
    try {
        const userId = getDataFromToken(request);
        const user = await db.adminUser.findUnique({ where: { id: userId }, select: { isAdmin: true } });
        if (user?.isAdmin) return userId;
    } catch {
        // invalid, expired or missing token
    }
    return null;
}

export function unauthorizedResponse() {
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
}

// Returns null when the request carries a valid admin session, otherwise a 401 response to return as-is.
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
    return (await getAdminId(request)) ? null : unauthorizedResponse();
}
