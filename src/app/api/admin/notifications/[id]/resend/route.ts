import { NextRequest, NextResponse } from "next/server";
import { resendNotification } from "@/lib/domain/notifications";
import { logAudit } from "@/lib/audit";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const result = await resendNotification(scope, params.id);
        if (!result.ok) {
            return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_found" ? 404 : 400 });
        }

        await logAudit({ actorType: "admin", actorId: scope.adminId, action: "notification.resend", entity: "NotificationLog", entityId: params.id, after: { result: result.data } });
        return NextResponse.json({
            status: "success",
            message: result.data === "SENT" ? "Message sent" : result.data === "SKIPPED" ? "Not sent: SMS is not fully set up" : "Sending failed again",
            data: { result: result.data },
        });
    } catch (error: any) {
        console.error("resend failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
