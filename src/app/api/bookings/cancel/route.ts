import { NextRequest, NextResponse } from "next/server";
import { cancelBooking } from "@/lib/domain/bookings";
import { isRateLimited } from "@/helpers/rateLimit";
import { getClientIp } from "@/helpers/clientIp";
import * as Sentry from "@sentry/nextjs";

const TEN_MINUTES = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
    try {
        if (await isRateLimited(`cancel:ip:${getClientIp(request)}`, 10, TEN_MINUTES)) {
            return NextResponse.json({ status: "error", message: "Too many attempts. Please try again later." }, { status: 429 });
        }

        const result = await cancelBooking(await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message });

        return NextResponse.json({ status: "success", message: "Booking cancelled", data: result.data });
    } catch (error: any) {
        console.error("cancel failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong. Please try again." }, { status: 500 });
    }
}
