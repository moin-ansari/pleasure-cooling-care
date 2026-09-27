import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/domain/adminBookings";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: await getDashboardStats(scope) });
    } catch (error: any) {
        console.error("dashboard failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
