import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { setReviewVisibility } from "@/lib/domain/reviews";
import { STOREFRONT_TAG } from "@/lib/storefront";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import * as Sentry from "@sentry/nextjs";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const result = await setReviewVisibility(scope, params.id, await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_found" ? 404 : 400 });

        revalidateTag(STOREFRONT_TAG);
        return NextResponse.json({ status: "success", message: result.data.isPublic ? "Review is now shown" : "Review hidden", data: result.data });
    } catch (error: any) {
        console.error("review visibility failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
