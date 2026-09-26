import { NextRequest, NextResponse } from "next/server";
import { listAssignableTechnicians } from "@/lib/domain/adminBookings";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const data = await listAssignableTechnicians(scope, params.id);
        if (!data) return NextResponse.json({ status: "error", message: "Booking not found" }, { status: 404 });

        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        console.error("assignable technicians failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
