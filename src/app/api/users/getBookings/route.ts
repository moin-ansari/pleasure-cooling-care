import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/helpers/requireAdmin";
import { legacyStatusFilter, toLegacyBooking } from "@/helpers/legacyBooking";

export async function POST(request: NextRequest) {
    try {

        const unauthorized = await requireAdmin(request);
        if (unauthorized) return unauthorized;

        const query = request.nextUrl.searchParams.get('bookings')

        const bookings = await db.booking.findMany({
            where: legacyStatusFilter(query),
            include: { serviceArea: true },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({ status: 'success', data: bookings.map(toLegacyBooking)})

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
