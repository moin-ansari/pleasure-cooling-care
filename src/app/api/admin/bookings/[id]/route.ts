import { NextRequest, NextResponse } from "next/server";
import { getBookingDetail } from "@/lib/domain/adminBookings";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();

        const booking = await getBookingDetail(params.id);
        if (!booking) return NextResponse.json({ status: "error", message: "Booking not found" }, { status: 404 });

        return NextResponse.json({ status: "success", data: booking });
    } catch (error: any) {
        console.error("admin booking failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
