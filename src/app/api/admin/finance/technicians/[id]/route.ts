import { NextRequest, NextResponse } from "next/server";
import { getTechnicianLedger } from "@/lib/domain/finance";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();

        const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
        const data = await getTechnicianLedger(params.id, Number.isFinite(page) ? page : 1);
        if (!data) return NextResponse.json({ status: "error", message: "Technician not found" }, { status: 404 });

        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        console.error("ledger failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
