import { NextRequest, NextResponse } from "next/server";
import { createBookingForAdmin, listBookings } from "@/lib/domain/adminBookings";
import { BOOKING_GROUPS, type BookingGroup } from "@/constants/booking";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const params = request.nextUrl.searchParams;
        const group = BOOKING_GROUPS.find((g) => g === params.get("group")) as BookingGroup | undefined;
        const page = Number(params.get("page") ?? "1");

        const data = await listBookings(scope, { group, q: params.get("q") ?? "", page: Number.isFinite(page) ? page : 1 });
        return NextResponse.json({ status: "success", data });
    } catch (error) {
        return serverError("admin bookings list failed", error);
    }
}

// A booking made for a customer who phoned. Same rules as the website form.
export async function POST(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await createBookingForAdmin(scope, await request.json()), "Booking created");
    } catch (error) {
        return serverError("admin booking create failed", error);
    }
}
