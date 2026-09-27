import { NextRequest, NextResponse } from "next/server";
import { TechnicianLoginSchema } from "@/schema/technician";
import { verifyTechnicianLogin } from "@/lib/domain/technicians";
import { setTechnicianCookie, signTechnicianToken } from "@/lib/technicianAuth";
import { isRateLimited } from "@/helpers/rateLimit";
import { getClientIp } from "@/helpers/clientIp";
import * as Sentry from "@sentry/nextjs";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
    try {
        const ip = getClientIp(request);
        // Wrong PINs are also counted per account in the database; this only slows bulk guessing from one place.
        if (await isRateLimited(`techlogin:ip:${ip}`, 30, FIFTEEN_MINUTES)) {
            return NextResponse.json({ status: "failed", message: "Too many attempts. Please try again later." }, { status: 429 });
        }

        const parsed = TechnicianLoginSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ status: "failed", message: parsed.error.issues[0].message });

        const result = await verifyTechnicianLogin(parsed.data.email, parsed.data.pin);
        if (!result.ok) return NextResponse.json({ status: "failed", code: result.code, message: result.message });

        const token = signTechnicianToken(result.data);
        const response = NextResponse.json({ status: "success", message: "Logged in", data: { name: result.data.name, token } });
        setTechnicianCookie(response, token);
        return response;
    } catch (error: any) {
        console.error("technician login failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong. Please try again." }, { status: 500 });
    }
}
