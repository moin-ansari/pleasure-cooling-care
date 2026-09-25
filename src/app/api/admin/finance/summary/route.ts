import { NextRequest, NextResponse } from "next/server";
import { getCommissionSettings, getFinanceSummary } from "@/lib/domain/finance";
import { rangeFromParams } from "@/helpers/rangeParams";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();

        const { preset, range } = rangeFromParams(request.nextUrl.searchParams);
        const [summary, commission] = await Promise.all([getFinanceSummary(range), getCommissionSettings()]);
        return NextResponse.json({ status: "success", data: { preset, summary, commission } });
    } catch (error: any) {
        console.error("finance summary failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
