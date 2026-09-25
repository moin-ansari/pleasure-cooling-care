import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDataFromToken } from "./getDataFromToken";

// Returns null when the request carries a valid admin session, otherwise a 401 response to return as-is.
// The token is verified before any database work so unauthenticated requests never reach the database.
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
    try {
        const userId = getDataFromToken(request);
        const user = await db.adminUser.findUnique({ where: { id: userId }, select: { isAdmin: true } });
        if (user?.isAdmin) return null;
    } catch {
        // invalid, expired or missing token
    }
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
}
