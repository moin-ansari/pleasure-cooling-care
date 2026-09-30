import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createServiceArea, listServiceAreas, listServiceAreasForAdmin } from "@/lib/domain/serviceAreas";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";
import { STOREFRONT_TAG } from "@/lib/storefront";

export async function GET(request: NextRequest) {
    try {
        // Closed districts, and which store serves each, are for admins only.
        if (request.nextUrl.searchParams.get("all") === "true") {
            const scope = await getAdminScope(request);
            if (!scope) return unauthorizedResponse();
            return NextResponse.json({ status: "success", data: await listServiceAreasForAdmin(scope) });
        }
        return NextResponse.json({ status: "success", data: await listServiceAreas({ activeOnly: true }) });
    } catch (error) {
        return serverError("service areas list failed", error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        const result = await createServiceArea(scope, await request.json());
        if (result.ok) revalidateTag(STOREFRONT_TAG);
        return respond(result, "District added");
    } catch (error) {
        return serverError("service area create failed", error);
    }
}
