import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { assignCityToStore } from "@/lib/domain/stores";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";
import { STOREFRONT_TAG } from "@/lib/storefront";

// Moves a city into a store. Owner only.
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        const result = await assignCityToStore(scope, params.id, await request.json());
        if (result.ok) revalidateTag(STOREFRONT_TAG);
        return respond(result, (d) => (d.techniciansUpdated ? `City moved. ${d.techniciansUpdated} technician${d.techniciansUpdated === 1 ? " no longer works" : "s no longer work"} here.` : "City moved"));
    } catch (error) {
        return serverError("assign city failed", error);
    }
}
