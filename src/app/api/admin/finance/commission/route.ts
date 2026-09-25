import { NextRequest, NextResponse } from "next/server";
import { updateCommissionSettings } from "@/lib/domain/finance";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";

export async function PUT(request: NextRequest) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const result = await updateCommissionSettings(adminId, await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message });

        return NextResponse.json({ status: "success", message: "Commission updated. It applies to jobs completed from now on.", data: result.data });
    } catch (error: any) {
        console.error("commission update failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
