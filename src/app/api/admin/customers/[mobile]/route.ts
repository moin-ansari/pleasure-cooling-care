import { NextRequest, NextResponse } from "next/server";
import { getCustomer } from "@/lib/domain/customers";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { serverError } from "@/helpers/respond";

export async function GET(request: NextRequest, { params }: { params: { mobile: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const data = await getCustomer(scope, params.mobile);
        if (!data) return NextResponse.json({ status: "error", code: "not_found", message: "Customer not found" }, { status: 404 });
        return NextResponse.json({ status: "success", data });
    } catch (error) {
        return serverError("customer failed", error);
    }
}
