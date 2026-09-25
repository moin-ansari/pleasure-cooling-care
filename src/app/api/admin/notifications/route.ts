import { NextRequest, NextResponse } from "next/server";
import { listNotifications } from "@/lib/domain/notifications";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

const STATUSES = ["SENT", "FAILED", "SKIPPED"] as const;

export async function GET(request: NextRequest) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();

        const params = request.nextUrl.searchParams;
        const status = STATUSES.find((s) => s === params.get("status"));
        const page = Number(params.get("page") ?? "1");

        const data = await listNotifications({ status, page: Number.isFinite(page) ? page : 1 });
        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        console.error("notifications list failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
