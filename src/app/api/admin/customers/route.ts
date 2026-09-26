import { NextRequest, NextResponse } from "next/server";
import { listCustomers } from "@/lib/domain/customers";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { serverError } from "@/helpers/respond";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const params = request.nextUrl.searchParams;
        const page = Number(params.get("page") ?? "1");
        return NextResponse.json({ status: "success", data: await listCustomers(scope, { q: params.get("q") ?? "", page: Number.isFinite(page) ? page : 1 }) });
    } catch (error) {
        return serverError("customers list failed", error);
    }
}
