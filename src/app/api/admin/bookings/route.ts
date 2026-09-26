import { NextRequest, NextResponse } from "next/server";
import { listBookings } from "@/lib/domain/adminBookings";
import { BOOKING_GROUPS, type BookingGroup } from "@/constants/booking";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const params = request.nextUrl.searchParams;
        const group = BOOKING_GROUPS.find((g) => g === params.get("group")) as BookingGroup | undefined;
        const page = Number(params.get("page") ?? "1");

        const data = await listBookings(scope, { group, q: params.get("q") ?? "", page: Number.isFinite(page) ? page : 1 });
        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        console.error("admin bookings list failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
