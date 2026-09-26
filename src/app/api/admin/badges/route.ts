import { NextRequest, NextResponse } from "next/server";
import { getAdminBadges } from "@/lib/domain/adminBadges";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: await getAdminBadges() });
    } catch (error: any) {
        console.error("badges failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
