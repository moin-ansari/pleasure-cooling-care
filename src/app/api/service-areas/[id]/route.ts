import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { deleteServiceArea, updateServiceArea } from "@/lib/domain/serviceAreas";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";
import { STOREFRONT_TAG } from "@/lib/storefront";

type Context = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        const result = await updateServiceArea(scope, params.id, await request.json());
        if (result.ok) revalidateTag(STOREFRONT_TAG);
        return respond(result, "District updated");
    } catch (error) {
        return serverError("service area update failed", error);
    }
}

export async function DELETE(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        const result = await deleteServiceArea(scope, params.id);
        if (result.ok) revalidateTag(STOREFRONT_TAG);
        return respond(result, "District deleted", { withData: false });
    } catch (error) {
        return serverError("service area delete failed", error);
    }
}
