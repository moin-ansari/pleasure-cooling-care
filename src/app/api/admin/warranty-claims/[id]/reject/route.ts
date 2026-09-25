import { NextRequest, NextResponse } from "next/server";
import { rejectWarrantyClaim } from "@/lib/domain/warranty";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const result = await rejectWarrantyClaim(params.id, adminId, await request.json());
        if (!result.ok) {
            return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_found" ? 404 : 400 });
        }
        return NextResponse.json({ status: "success", message: "Claim declined", data: result.data });
    } catch (error: any) {
        console.error("claim reject failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
