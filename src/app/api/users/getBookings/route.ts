import { NextRequest, NextResponse } from "next/server";
import { connect } from '@/db/db';
import BookRequest from "@/models/bookRequest.model"
import { requireAdmin } from "@/helpers/requireAdmin";

export async function POST(request: NextRequest) {
    try {

        const unauthorized = await requireAdmin(request);
        if (unauthorized) return unauthorized;

        connect();

        const searchParams = request.nextUrl.searchParams
        const query = searchParams.get('bookings')

        const bookings: any = await BookRequest.find({status: query})

        return NextResponse.json({ status: 'success', data: bookings})

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
