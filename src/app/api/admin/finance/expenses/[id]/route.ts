import { NextRequest, NextResponse } from "next/server";
import { deleteExpense, updateExpense } from "@/lib/domain/finance";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";

type Context = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const result = await updateExpense(scope, params.id, await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_found" ? 404 : 400 });

        return NextResponse.json({ status: "success", message: "Saved", data: result.data });
    } catch (error: any) {
        console.error("expense update failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const result = await deleteExpense(scope, params.id);
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: 404 });

        return NextResponse.json({ status: "success", message: "Deleted" });
    } catch (error: any) {
        console.error("expense delete failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
