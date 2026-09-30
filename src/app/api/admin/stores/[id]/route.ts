import { NextRequest } from "next/server";
import { updateStore } from "@/lib/domain/stores";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await updateStore(scope, params.id, await request.json()), "Store saved");
    } catch (error) {
        return serverError("store update failed", error);
    }
}
