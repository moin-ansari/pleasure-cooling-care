import { NextRequest, NextResponse } from "next/server";
import { listNotifications } from "@/lib/domain/notifications";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";

const STATUSES = ["SENT", "FAILED", "SKIPPED"] as const;
const RECIPIENTS = ["customer", "technician", "admin"] as const;

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const params = request.nextUrl.searchParams;
        const status = STATUSES.find((s) => s === params.get("status"));
        const page = Number(params.get("page") ?? "1");

        const recipient = RECIPIENTS.find((r) => r === params.get("recipient"));
        const q = (params.get("q") ?? "").slice(0, 40);

        const data = await listNotifications(scope, { status, recipient, q, page: Number.isFinite(page) ? page : 1 });
        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        console.error("notifications list failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
