import { NextRequest, NextResponse } from "next/server";
import { resendAllFailed } from "@/lib/domain/notifications";
import { logAudit } from "@/lib/audit";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { serverError } from "@/helpers/respond";

export async function POST(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        const data = await resendAllFailed(scope);
        await logAudit({ actorType: "admin", actorId: scope.adminId, action: "notification.resendAll", entity: "NotificationLog", entityId: "bulk", before: {}, after: data });
        const message = data.tried === 0 ? "No failed messages" : `${data.sent} of ${data.tried} sent`;
        return NextResponse.json({ status: "success", message, data });
    } catch (error) {
        return serverError("resend all failed", error);
    }
}
