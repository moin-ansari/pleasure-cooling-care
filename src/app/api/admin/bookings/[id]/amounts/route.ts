import { NextRequest, NextResponse } from "next/server";
import { correctCompletedAmounts } from "@/lib/domain/finance";
import { getBookingDetail } from "@/lib/domain/adminBookings";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const result = await correctCompletedAmounts(scope, params.id, await request.json());
        if (!result.ok) {
            return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_found" ? 404 : 400 });
        }
        return NextResponse.json({ status: "success", message: "Amounts corrected", data: { booking: await getBookingDetail(scope, params.id), commissionChange: result.data.commissionChange } });
    } catch (error: any) {
        console.error("amounts correction failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
