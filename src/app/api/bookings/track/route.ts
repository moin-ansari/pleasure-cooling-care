import { NextRequest, NextResponse } from "next/server";
import { trackBookingsByPhone } from "@/lib/domain/bookings";
import { isRateLimited } from "@/helpers/rateLimit";
import { getClientIp } from "@/helpers/clientIp";
import * as Sentry from "@sentry/nextjs";

const TEN_MINUTES = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
    try {
        // Phone number is the only key, so lookups are limited hard to stop people scanning numbers.
        if (await isRateLimited(`track:ip:${getClientIp(request)}`, 10, TEN_MINUTES)) {
            return NextResponse.json({ status: "error", message: "Too many lookups. Please try again later." }, { status: 429 });
        }

        const result = await trackBookingsByPhone(await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message });

        return NextResponse.json({ status: "success", data: result.data });
    } catch (error: any) {
        console.error("track failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong. Please try again." }, { status: 500 });
    }
}
