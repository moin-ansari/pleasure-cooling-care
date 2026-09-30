import { NextRequest, NextResponse } from "next/server";
import { getFinanceSummary } from "@/lib/domain/finance";
import { rangeFromParams } from "@/helpers/rangeParams";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { serverError } from "@/helpers/respond";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const { preset, range } = rangeFromParams(request.nextUrl.searchParams);
        return NextResponse.json({ status: "success", data: { preset, summary: await getFinanceSummary(scope, range) } });
    } catch (error) {
        return serverError("finance summary failed", error);
    }
}
