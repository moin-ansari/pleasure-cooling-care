import { NextRequest, NextResponse } from "next/server";
import { getAdminBadges } from "@/lib/domain/adminBadges";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: await getAdminBadges(scope) });
    } catch (error: any) {
        console.error("badges failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
