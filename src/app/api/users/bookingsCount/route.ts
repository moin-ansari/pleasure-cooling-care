import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/helpers/requireAdmin";
import { legacyStatusFilter } from "@/helpers/legacyBooking";

export async function POST(request: NextRequest) {
    try {

        const unauthorized = await requireAdmin(request);
        if (unauthorized) return unauthorized;

        const query = request.nextUrl.searchParams.get('bookings')

        const count = await db.booking.count({ where: legacyStatusFilter(query) })

        return NextResponse.json({ status: 'success', count: count})

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
