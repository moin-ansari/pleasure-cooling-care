import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/helpers/requireAdmin";
import { toLegacyBooking } from "@/helpers/legacyBooking";

export async function POST(request: NextRequest, { params }: { params: { id: string }}) {
    try {

        const unauthorized = await requireAdmin(request);
        if (unauthorized) return unauthorized;

        const booking = await db.booking.findUnique({
            where: { id: params.id },
            include: { serviceArea: true },
        })

        if (!booking) {
            return NextResponse.json({ status: 'error', message: "Booking not found"})
        }

        return NextResponse.json({ status: 'success', data: toLegacyBooking(booking)})

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
