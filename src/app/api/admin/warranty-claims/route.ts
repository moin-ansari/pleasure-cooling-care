import { NextRequest, NextResponse } from "next/server";
import { listWarrantyClaims, type ClaimStatusValue } from "@/lib/domain/warranty";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";

const STATUSES: ClaimStatusValue[] = ["PENDING", "APPROVED", "REJECTED"];

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const status = request.nextUrl.searchParams.get("status") as ClaimStatusValue | null;
        const data = await listWarrantyClaims(scope, status && STATUSES.includes(status) ? status : undefined);
        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        console.error("claims list failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
