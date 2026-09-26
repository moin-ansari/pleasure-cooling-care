import { NextRequest, NextResponse } from "next/server";
import { createExpense, listExpenses } from "@/lib/domain/finance";
import { rangeFromParams } from "@/helpers/rangeParams";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const params = request.nextUrl.searchParams;
        const { preset, range } = rangeFromParams(params);
        const page = Number(params.get("page") ?? "1");
        const data = await listExpenses(scope, range, Number.isFinite(page) ? page : 1);
        return NextResponse.json({ status: "success", data: { ...data, preset } });
    } catch (error: any) {
        console.error("expenses list failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const result = await createExpense(scope, await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message });

        return NextResponse.json({ status: "success", message: "Saved", data: result.data });
    } catch (error: any) {
        console.error("expense create failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
