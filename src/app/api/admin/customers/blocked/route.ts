import { NextRequest } from "next/server";
import { listBlocked } from "@/lib/domain/customers";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

// Numbers that cannot book. Owner only.
export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await listBlocked(scope), "");
    } catch (error) {
        return serverError("blocked list failed", error);
    }
}
