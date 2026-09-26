import { NextRequest, NextResponse } from "next/server";
import { setAdminAlertPhone } from "@/lib/domain/notifications";
import { updateCommissionSettings } from "@/lib/domain/finance";
import { getAdminSettings, updateCancelCutoff, updateRankSettings } from "@/lib/domain/settings";
import { smsIsConfigured } from "@/lib/sms/msg91";
import { logAudit } from "@/lib/audit";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: { ...(await getAdminSettings()), smsConfigured: smsIsConfigured() } });
    } catch (error: any) {
        console.error("settings failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}

// One section is saved at a time: { section: "alert" | "commission" | "cutoff" | "ranks", ...values }
export async function PUT(request: NextRequest) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const body = await request.json();
        const fail = (message: string, code?: string) => NextResponse.json({ status: "error", code, message });

        switch (body?.section) {
            case "alert": {
                const result = await setAdminAlertPhone(String(body?.adminAlertPhone ?? ""));
                if (!result.ok) return fail(result.message, result.code);
                await logAudit({ actorType: "admin", actorId: adminId, action: "settings.adminAlertPhone", entity: "Settings", entityId: "1", after: { adminAlertPhone: result.data } });
                return NextResponse.json({ status: "success", message: result.data ? "Alert number saved" : "New booking alerts turned off" });
            }
            case "commission": {
                const result = await updateCommissionSettings(adminId, body);
                if (!result.ok) return fail(result.message, result.code);
                return NextResponse.json({ status: "success", message: "Commission saved. It applies to jobs completed from now on." });
            }
            case "cutoff": {
                const result = await updateCancelCutoff(adminId, body);
                if (!result.ok) return fail(result.message, result.code);
                return NextResponse.json({ status: "success", message: "Cancellation rule saved" });
            }
            case "ranks": {
                const result = await updateRankSettings(adminId, body);
                if (!result.ok) return fail(result.message, result.code);
                return NextResponse.json({ status: "success", message: result.data.updated ? `Ranks saved. ${result.data.updated} technician${result.data.updated === 1 ? "" : "s"} changed rank.` : "Ranks saved" });
            }
            default:
                return fail("Unknown settings section");
        }
    } catch (error: any) {
        console.error("settings update failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
