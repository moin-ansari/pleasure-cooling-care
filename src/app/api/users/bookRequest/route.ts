import { NextRequest, NextResponse } from "next/server";
import { connect } from '@/db/db';
import BookRequest from "@/models/bookRequest.model"

export async function POST(request: NextRequest) {
    try {

        connect();    

        const req = await request.json();

        if(!req){
            return NextResponse.json({ status: 'error', message: "Please fill all the fields"})
        }

        const bookRequest = new BookRequest(req);

        return NextResponse.json({ status: 'success', message: "Booked Request Successfully", data: bookRequest})
        
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}