import { NextRequest } from "next/server";
import { createCoAdmin } from "@/lib/domain/stores";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

// Owner only. There is no public sign-up: every co-admin is created here.
export async function POST(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await createCoAdmin(scope, await request.json()), "Co-admin created");
    } catch (error) {
        return serverError("co-admin create failed", error);
    }
}
