import { NextRequest, NextResponse } from "next/server";
import { listReviewsForAdmin } from "@/lib/domain/reviews";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();

        const filter = request.nextUrl.searchParams.get("filter");
        const data = await listReviewsForAdmin(filter === "hidden" || filter === "low" ? filter : "all");
        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        console.error("reviews list failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
