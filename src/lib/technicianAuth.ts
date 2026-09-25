import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { pinVersionOf } from "@/lib/domain/technicians";

export const TECHNICIAN_COOKIE = "techtoken";
const TOKEN_DAYS = 7;

export function signTechnicianToken(technician: { id: string; pinVersion: string }): string {
    return jwt.sign({ id: technician.id, role: "technician", pv: technician.pinVersion }, process.env.SECRET_TOKEN!, {
        expiresIn: `${TOKEN_DAYS}d`,
    });
}

export function setTechnicianCookie(response: NextResponse, token: string) {
    response.cookies.set(TECHNICIAN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: TOKEN_DAYS * 24 * 60 * 60,
    });
}

// Web uses the cookie; a future mobile app sends "Authorization: Bearer <token>".
function readToken(request: NextRequest): string {
    const header = request.headers.get("authorization");
    if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
    return request.cookies.get(TECHNICIAN_COOKIE)?.value ?? "";
}

// Returns the technician's id for a valid session, otherwise null. Deactivated technicians and
// tokens issued before a PIN change are refused.
export async function getTechnicianId(request: NextRequest): Promise<string | null> {
    try {
        const token = readToken(request);
        if (!token) return null;

        const payload = jwt.verify(token, process.env.SECRET_TOKEN!) as { id?: string; role?: string; pv?: string };
        if (payload.role !== "technician" || !payload.id) return null;

        const technician = await db.technician.findUnique({
            where: { id: payload.id },
            select: { isActive: true, pinHash: true },
        });
        if (!technician?.isActive || pinVersionOf(technician.pinHash) !== payload.pv) return null;

        return payload.id;
    } catch {
        return null;
    }
}

export function technicianUnauthorized() {
    return NextResponse.json({ status: "error", message: "Please log in again" }, { status: 401 });
}
