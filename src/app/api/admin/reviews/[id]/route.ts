import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { setReviewVisibility } from "@/lib/domain/reviews";
import { STOREFRONT_TAG } from "@/lib/storefront";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const result = await setReviewVisibility(params.id, adminId, await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_found" ? 404 : 400 });

        revalidateTag(STOREFRONT_TAG);
        return NextResponse.json({ status: "success", message: result.data.isPublic ? "Review is now shown" : "Review hidden", data: result.data });
    } catch (error: any) {
        console.error("review visibility failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
