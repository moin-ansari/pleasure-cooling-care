import { NextRequest, NextResponse } from "next/server";
import { getTechnicianProfile } from "@/lib/domain/technicianProfile";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { serverError } from "@/helpers/respond";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const data = await getTechnicianProfile(scope, params.id);
        if (!data) return NextResponse.json({ status: "error", code: "not_found", message: "Technician not found" }, { status: 404 });
        return NextResponse.json({ status: "success", data });
    } catch (error) {
        return serverError("technician profile failed", error);
    }
}
