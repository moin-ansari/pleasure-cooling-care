import { NextRequest, NextResponse } from "next/server";
import { getTechnicianEarnings } from "@/lib/domain/finance";
import { currentMonth } from "@/lib/dateRange";
import { getTechnicianId, technicianUnauthorized } from "@/lib/technicianAuth";

export async function GET(request: NextRequest) {
    try {
        const technicianId = await getTechnicianId(request);
        if (!technicianId) return technicianUnauthorized();

        const month = request.nextUrl.searchParams.get("month") ?? currentMonth();
        const data = await getTechnicianEarnings(technicianId, month);
        if (!data) return NextResponse.json({ status: "error", message: "Choose a valid month" }, { status: 400 });

        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        console.error("earnings failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
