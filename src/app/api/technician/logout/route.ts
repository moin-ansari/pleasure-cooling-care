import { NextResponse } from "next/server";
import { TECHNICIAN_COOKIE } from "@/lib/technicianAuth";

export async function POST() {
    const response = NextResponse.json({ status: "success", message: "Logged out" });
    response.cookies.set(TECHNICIAN_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
    return response;
}
