import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { SUB_TYPES } from "@/constants/appliances";
import { findActiveService } from "@/lib/domain/services";
import { generateBookingRef } from "@/lib/bookingRef";

export async function POST(request: NextRequest) {
    try {

        const body = await request.json();

        if(!body){
            return NextResponse.json({ status: 'error', message: "Please fill all the fields"})
        }

        const subType = SUB_TYPES.AC.find((t) => t.toLowerCase() === String(body.acType ?? "").toLowerCase());
        const service = subType ? await findActiveService("AC", subType, String(body.serviceType ?? "")) : null;

        if(!service || !subType){
            return NextResponse.json({ status: 'error', message: "Selected service is not available"})
        }

        const mobile = String(body.mobile ?? "");
        if(!/^\d{10}$/.test(mobile)){
            return NextResponse.json({ status: 'error', message: "Enter a valid 10 digit mobile number"})
        }

        const name = String(body.name ?? "").trim();
        const streetAddress = String(body.streetAddress ?? "").trim();
        const pincode = String(body.zipcode ?? "").trim();
        const date = new Date(body.date);

        if(name.length < 2 || streetAddress.length < 5 || !/^\d{6}$/.test(pincode) || Number.isNaN(date.getTime()) || !body.time){
            return NextResponse.json({ status: 'error', message: "Please fill all the fields correctly"})
        }

        if (await db.blockedPhone.findUnique({ where: { mobile } })) {
            return NextResponse.json({ status: 'error', message: "Unable to book with this number. Please contact us."})
        }

        const serviceArea = await db.serviceArea.findFirst({
            where: { district: { equals: String(body.city ?? "").trim(), mode: "insensitive" }, isActive: true },
        })

        if(!serviceArea){
            return NextResponse.json({ status: 'error', message: "Sorry, we don't serve this area yet"})
        }

        const data = {
            source: "WEB" as const,
            status: "NEW" as const,
            customerName: name,
            mobile,
            streetAddress,
            town: serviceArea.district,
            pincode,
            serviceAreaId: serviceArea.id,
            date,
            time: String(body.time),
            applianceCategory: "AC" as const,
            serviceId: service.id,
            applianceSubType: subType,
            serviceType: service.serviceType,
            price: service.price,
            statusHistory: { create: { toStatus: "NEW" as const, changedByType: "customer" } },
        };

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const booking = await db.booking.create({ data: { ...data, bookingRef: generateBookingRef() } });
                return NextResponse.json({ status: 'success', message: "Booked Request Successfully", data: { bookingRef: booking.bookingRef }})
            } catch (error) {
                const collision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
                if (!collision || attempt === 2) throw error;
            }
        }

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
