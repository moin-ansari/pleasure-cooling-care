import { NextRequest, NextResponse } from "next/server";
import { connect } from '@/db/db';
import BookRequest from "@/models/bookRequest.model"
import { requireAdmin } from "@/helpers/requireAdmin";

export async function PUT(request: NextRequest, { params }: { params: { id: string }}) {
    try {

        const unauthorized = await requireAdmin(request);
        if (unauthorized) return unauthorized;

        connect();
        const action = request.nextUrl.searchParams.get('params')?.split(',')[0];

        if (action === 'cancel' || action === 'complete') {
            const updateData = { status: action === 'cancel' ? 'cancelled' : 'completed' };

            let updatedBooking = await BookRequest.findByIdAndUpdate(
                params.id,
                updateData,
                { new: true }
            );
            return NextResponse.json({ status: 'success', data: updatedBooking})
        }

        return NextResponse.json({ status: 'error', message: "error while updatation"})

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
