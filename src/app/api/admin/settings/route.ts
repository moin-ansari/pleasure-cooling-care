import { NextRequest, NextResponse } from "next/server";
import { getAdminAlertPhone, setAdminAlertPhone } from "@/lib/domain/notifications";
import { smsIsConfigured } from "@/lib/sms/msg91";
import { logAudit } from "@/lib/audit";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: { adminAlertPhone: await getAdminAlertPhone(), smsConfigured: smsIsConfigured() } });
    } catch (error: any) {
        console.error("settings failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const body = await request.json();
        const result = await setAdminAlertPhone(String(body?.adminAlertPhone ?? ""));
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message });

        await logAudit({ actorType: "admin", actorId: adminId, action: "settings.adminAlertPhone", entity: "Settings", entityId: "1", after: { adminAlertPhone: result.data } });
        return NextResponse.json({ status: "success", message: result.data ? "Alert number saved" : "New booking alerts turned off", data: { adminAlertPhone: result.data } });
    } catch (error: any) {
        console.error("settings update failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
