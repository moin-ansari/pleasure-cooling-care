import { NextRequest } from "next/server";
import { ACTIVITY_GROUPS, type ActivityGroupKey } from "@/constants/activity";
import { listActivity } from "@/lib/domain/activity";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

// Who changed what, and when. Owner only.
export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const params = request.nextUrl.searchParams;
        const group = ACTIVITY_GROUPS.find((g) => g.key === params.get("group"))?.key as ActivityGroupKey | undefined;
        const page = Number(params.get("page") ?? "1");
        return respond(await listActivity(scope, { group, q: params.get("q") ?? "", page: Number.isFinite(page) ? page : 1 }), "");
    } catch (error) {
        return serverError("activity failed", error);
    }
}
