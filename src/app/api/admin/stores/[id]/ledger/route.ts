import { NextRequest, NextResponse } from "next/server";
import { getStoreLedger, recordStorePayment } from "@/lib/domain/finance";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

type Context = { params: { id: string } };

// What a store owes the owner. The owner and that store's own admins can read it. Only the owner can record payments.
export async function GET(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
        const data = await getStoreLedger(scope, params.id, Number.isFinite(page) ? page : 1);
        if (!data) return NextResponse.json({ status: "error", code: "not_found", message: "Store not found" }, { status: 404 });
        return NextResponse.json({ status: "success", data });
    } catch (error) {
        return serverError("store ledger failed", error);
    }
}

export async function POST(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await recordStorePayment(scope, params.id, await request.json()), "Recorded");
    } catch (error) {
        return serverError("store payment failed", error);
    }
}
