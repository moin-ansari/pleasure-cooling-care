import { NextRequest, NextResponse } from "next/server";
import { connect } from '@/db/db';
import BookRequest from "@/models/bookRequest.model"

export async function POST(request: NextRequest) {
    try {

        connect();    

        let req = await request.json();

        if(!req){
            return NextResponse.json({ status: 'error', message: "Please fill all the fields"})
        }

        let reqTime = new Date();
        
        req = { ...req, status: "pending", requestedDate: reqTime }

        const bookRequest = await new BookRequest(req);

        console.log(bookRequest)

        const savedBookRequest = await bookRequest.save();

        return NextResponse.json({ status: 'success', message: "Booked Request Successfully", data: savedBookRequest})
        
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}