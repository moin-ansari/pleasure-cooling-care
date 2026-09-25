import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/helpers/requireAdmin";
import { toLegacyBooking } from "@/helpers/legacyBooking";

export async function PUT(request: NextRequest, { params }: { params: { id: string }}) {
    try {

        const unauthorized = await requireAdmin(request);
        if (unauthorized) return unauthorized;

        const action = request.nextUrl.searchParams.get('params')?.split(',')[0];

        if (action !== 'cancel' && action !== 'complete') {
            return NextResponse.json({ status: 'error', message: "error while updatation"})
        }

        const current = await db.booking.findUnique({ where: { id: params.id }, select: { status: true } });

        if (!current) {
            return NextResponse.json({ status: 'error', message: "Booking not found"})
        }

        if (current.status === "COMPLETED" || current.status === "CANCELLED") {
            return NextResponse.json({ status: 'error', message: "Booking is already closed"})
        }

        const toStatus = action === 'cancel' ? "CANCELLED" : "COMPLETED";

        const updatedBooking = await db.booking.update({
            where: { id: params.id },
            data: {
                status: toStatus,
                completedAt: toStatus === "COMPLETED" ? new Date() : undefined,
                statusHistory: {
                    create: { fromStatus: current.status, toStatus, changedByType: "admin" },
                },
            },
            include: { serviceArea: true },
        });

        return NextResponse.json({ status: 'success', data: toLegacyBooking(updatedBooking)})

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
