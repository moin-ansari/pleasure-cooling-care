import { NextRequest, NextResponse } from "next/server";
import { connect } from '@/db/db';
import BookRequest from "@/models/bookRequest.model"

export async function POST(request: NextRequest, { params }: { params: { id: string }}) {
    try {

        connect();    

        const bookings: any = await BookRequest.findOne({_id: params.id})

        return NextResponse.json({ status: 'success', data: bookings})
        
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}