import { NextRequest, NextResponse } from "next/server";
import { connect } from '@/db/db';
import BookRequest from "@/models/bookRequest.model"
import { getServicePrice } from "@/helpers/servicePrice";

export async function POST(request: NextRequest) {
    try {

        const body = await request.json();

        if(!body){
            return NextResponse.json({ status: 'error', message: "Please fill all the fields"})
        }

        const price = getServicePrice(body.serviceType, body.acType);

        if(price === null){
            return NextResponse.json({ status: 'error', message: "Selected service is not available"})
        }

        if(!/^\d{10}$/.test(String(body.mobile ?? ""))){
            return NextResponse.json({ status: 'error', message: "Enter a valid 10 digit mobile number"})
        }

        connect();

        // whitelist accepted fields; status, requestedDate and price are always set by the server
        const req = {
            name: body.name,
            mobile: body.mobile,
            serviceType: body.serviceType,
            acType: body.acType,
            date: body.date,
            time: body.time,
            streetAddress: body.streetAddress,
            city: body.city,
            state: body.state,
            zipcode: body.zipcode,
            country: body.country,
            price,
            status: "pending",
            requestedDate: new Date(),
        }

        const bookRequest = new BookRequest(req);

        await bookRequest.save();

        return NextResponse.json({ status: 'success', message: "Booked Request Successfully"})

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
