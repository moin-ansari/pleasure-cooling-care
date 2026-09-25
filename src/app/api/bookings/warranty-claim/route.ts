import { NextRequest, NextResponse } from "next/server";
import { submitWarrantyClaim } from "@/lib/domain/warranty";
import { isRateLimited } from "@/helpers/rateLimit";
import { getClientIp } from "@/helpers/clientIp";

const TEN_MINUTES = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
    try {
        if (isRateLimited(`claim:ip:${getClientIp(request)}`, 5, TEN_MINUTES)) {
            return NextResponse.json({ status: "error", message: "Too many attempts. Please try again later." }, { status: 429 });
        }

        const result = await submitWarrantyClaim(await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message });

        return NextResponse.json({ status: "success", message: "Claim sent. We will get back to you soon." });
    } catch (error: any) {
        console.error("warranty claim failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong. Please try again." }, { status: 500 });
    }
}
