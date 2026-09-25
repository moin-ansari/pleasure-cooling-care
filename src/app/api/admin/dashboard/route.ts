import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/domain/adminBookings";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: await getDashboardStats() });
    } catch (error: any) {
        console.error("dashboard failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
