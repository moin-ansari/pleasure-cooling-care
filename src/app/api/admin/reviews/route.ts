import { NextRequest, NextResponse } from "next/server";
import { listReviewsForAdmin } from "@/lib/domain/reviews";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const filter = request.nextUrl.searchParams.get("filter");
        const data = await listReviewsForAdmin(scope, filter === "hidden" || filter === "low" ? filter : "all");
        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        console.error("reviews list failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
