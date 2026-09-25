import { NextRequest, NextResponse } from "next/server";
import { listAssignableTechnicians } from "@/lib/domain/adminBookings";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();

        const data = await listAssignableTechnicians(params.id);
        if (!data) return NextResponse.json({ status: "error", message: "Booking not found" }, { status: 404 });

        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        console.error("assignable technicians failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
