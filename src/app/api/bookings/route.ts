import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/domain/bookings";
import { normalizeIndianMobile } from "@/lib/phone";
import { isRateLimited } from "@/helpers/rateLimit";
import { getClientIp } from "@/helpers/clientIp";
import { verifyTurnstile } from "@/helpers/turnstile";
import * as Sentry from "@sentry/nextjs";

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
    try {
        const ip = getClientIp(request);
        if (await isRateLimited(`booking:ip:${ip}`, 5, TEN_MINUTES)) {
            return NextResponse.json({ status: "error", message: "Too many requests. Please try again in a few minutes." }, { status: 429 });
        }

        const body = await request.json();

        // Hidden field real visitors never fill in. Pretend success so bots learn nothing.
        if (body?.website) {
            return NextResponse.json({ status: "success", message: "Booked Request Successfully", data: { bookingRef: "PCC-000000" } });
        }

        if (!(await verifyTurnstile(body?.turnstileToken, ip))) {
            return NextResponse.json({ status: "error", message: "Please try booking again." }, { status: 400 });
        }

        const mobile = normalizeIndianMobile(String(body?.mobile ?? ""));
        if (mobile && (await isRateLimited(`booking:mobile:${mobile}`, 3, ONE_HOUR))) {
            return NextResponse.json({ status: "error", message: "Too many bookings for this number. Please call us." }, { status: 429 });
        }

        const result = await createBooking(body, { source: "WEB" });
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message });

        return NextResponse.json({ status: "success", message: "Booked Request Successfully", data: result.data });
    } catch (error: any) {
        console.error("booking failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong. Please try again." }, { status: 500 });
    }
}
