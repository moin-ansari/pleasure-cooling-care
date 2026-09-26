import { NextRequest, NextResponse } from "next/server";
import { recordLedgerEntry } from "@/lib/domain/finance";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const result = await recordLedgerEntry(scope, params.id, await request.json());
        if (!result.ok) {
            return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_found" ? 404 : 400 });
        }
        return NextResponse.json({ status: "success", message: "Saved", data: result.data });
    } catch (error: any) {
        console.error("ledger entry failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
