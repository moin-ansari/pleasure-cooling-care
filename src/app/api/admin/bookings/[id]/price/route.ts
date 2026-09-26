import { NextRequest, NextResponse } from "next/server";
import { updateBookingPrice } from "@/lib/domain/adminBookings";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const result = await updateBookingPrice(scope, params.id, await request.json());
        if (!result.ok) {
            return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_found" ? 404 : 400 });
        }
        return NextResponse.json({ status: "success", message: "Price updated", data: result.data });
    } catch (error: any) {
        console.error("price update failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
