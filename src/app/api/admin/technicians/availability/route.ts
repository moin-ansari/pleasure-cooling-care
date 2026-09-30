import { NextRequest, NextResponse } from "next/server";
import { getTeamAvailability } from "@/lib/domain/availability";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { serverError } from "@/helpers/respond";

// Who is free on a day. Limited to the admin's own stores.
export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: await getTeamAvailability(scope, request.nextUrl.searchParams.get("date") ?? undefined) });
    } catch (error) {
        return serverError("team availability failed", error);
    }
}
