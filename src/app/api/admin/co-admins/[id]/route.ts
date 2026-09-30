import { NextRequest } from "next/server";
import { updateCoAdmin } from "@/lib/domain/stores";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await updateCoAdmin(scope, params.id, await request.json()), "Co-admin saved");
    } catch (error) {
        return serverError("co-admin update failed", error);
    }
}
