import { NextRequest, NextResponse } from "next/server";
import { correctCompletedAmounts } from "@/lib/domain/finance";
import { getBookingDetail } from "@/lib/domain/adminBookings";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const result = await correctCompletedAmounts(params.id, adminId, await request.json());
        if (!result.ok) {
            return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_found" ? 404 : 400 });
        }
        return NextResponse.json({ status: "success", message: "Amounts corrected", data: { booking: await getBookingDetail(params.id), commissionChange: result.data.commissionChange } });
    } catch (error: any) {
        console.error("amounts correction failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
