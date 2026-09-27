import { NextRequest, NextResponse } from "next/server";
import { assignBooking } from "@/lib/domain/adminBookings";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { statusFor } from "@/helpers/respond";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const result = await assignBooking(scope, params.id, await request.json());
        if (!result.ok) {
            return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: statusFor(result.code) });
        }
        return NextResponse.json({ status: "success", message: "Booking confirmed and assigned", data: result.data });
    } catch (error: any) {
        console.error("assign failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
