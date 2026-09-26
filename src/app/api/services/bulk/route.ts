import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { bulkUpdateServices } from "@/lib/domain/services";
import { getAdminId, unauthorizedResponse, getAdminScope, forbiddenResponse } from "@/helpers/requireAdmin";
import { isOwner } from "@/lib/scope";
import { STOREFRONT_TAG } from "@/lib/storefront";

export async function POST(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        if (!isOwner(scope)) return forbiddenResponse();
        const adminId = scope.adminId;

        const result = await bulkUpdateServices(adminId, await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_found" ? 404 : 400 });

        revalidateTag(STOREFRONT_TAG);
        const n = result.data.updated;
        return NextResponse.json({ status: "success", message: `${n} ${n === 1 ? "service" : "services"} updated`, data: result.data });
    } catch (error: any) {
        console.error("service bulk failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
