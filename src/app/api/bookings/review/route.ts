import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { submitReview } from "@/lib/domain/reviews";
import { STOREFRONT_TAG } from "@/lib/storefront";
import { isRateLimited } from "@/helpers/rateLimit";
import { getClientIp } from "@/helpers/clientIp";

const TEN_MINUTES = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
    try {
        if (isRateLimited(`review:ip:${getClientIp(request)}`, 10, TEN_MINUTES)) {
            return NextResponse.json({ status: "error", message: "Too many attempts. Please try again later." }, { status: 429 });
        }

        const result = await submitReview(await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message });

        revalidateTag(STOREFRONT_TAG);
        return NextResponse.json({ status: "success", message: "Thank you for your review" });
    } catch (error: any) {
        console.error("review failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong. Please try again." }, { status: 500 });
    }
}
