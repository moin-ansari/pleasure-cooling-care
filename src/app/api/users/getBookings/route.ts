import { NextRequest, NextResponse } from "next/server";
import { connect } from '@/db/db';
import BookRequest from "@/models/bookRequest.model"

export async function POST(request: NextRequest) {
    try {

        connect();    

        const searchParams = request.nextUrl.searchParams
        const query = searchParams.get('bookings')

        const bookings: any = await BookRequest.find({status: query})

        console.log(bookings)

        return NextResponse.json({ status: 'success', data: bookings})
        
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}