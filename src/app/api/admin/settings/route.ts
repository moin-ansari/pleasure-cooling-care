import { NextRequest, NextResponse } from "next/server";
import { getAdminSettings, updateCancelCutoff, updateRankSettings } from "@/lib/domain/settings";
import { getMainStoreId, updateStoreAlertPhone } from "@/lib/domain/stores";
import { smsIsConfigured } from "@/lib/sms/msg91";
import { normalizeIndianMobile } from "@/lib/phone";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: { ...(await getAdminSettings(scope)), smsConfigured: smsIsConfigured() } });
    } catch (error) {
        return serverError("settings failed", error);
    }
}

// One section is saved at a time: { section: "alert" | "cutoff" | "ranks", ...values }
// Commission terms and the alert numbers of other stores are managed on the Stores screen.
export async function PUT(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const body = await request.json();
        switch (body?.section) {
            case "alert": {
                const raw = String(body?.adminAlertPhone ?? "");
                const phone = raw.trim() === "" ? "" : normalizeIndianMobile(raw);
                const storeId = scope.storeIds ? scope.storeIds[0] : await getMainStoreId();
                return respond(await updateStoreAlertPhone(scope, storeId, { adminAlertPhone: phone }), (d) => (d.adminAlertPhone ? "Alert number saved" : "New booking alerts turned off"), { withData: false });
            }
            case "cutoff":
                return respond(await updateCancelCutoff(scope, body), "Cancellation rule saved", { withData: false });
            case "ranks":
                return respond(await updateRankSettings(scope, body), (d) => (d.updated ? `Ranks saved. ${d.updated} technician${d.updated === 1 ? "" : "s"} changed rank.` : "Ranks saved"), { withData: false });
            default:
                return NextResponse.json({ status: "error", code: "invalid", message: "Unknown settings section" }, { status: 400 });
        }
    } catch (error) {
        return serverError("settings update failed", error);
    }
}
