import { NextRequest, NextResponse } from "next/server";
import { getSchedule } from "@/lib/domain/adminBookings";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { serverError } from "@/helpers/respond";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: await getSchedule(scope, request.nextUrl.searchParams.get("date") ?? undefined) });
    } catch (error) {
        return serverError("schedule failed", error);
    }
}
