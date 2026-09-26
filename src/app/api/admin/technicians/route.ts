import { NextRequest, NextResponse } from "next/server";
import { CreateTechnicianSchema } from "@/schema/technician";
import { createTechnician, getTechnician, listTechnicians } from "@/lib/domain/technicians";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";
import { normalizeIndianMobile } from "@/lib/phone";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: await listTechnicians(scope) });
    } catch (error) {
        return serverError("technicians list failed", error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const body = await request.json();
        const parsed = CreateTechnicianSchema.safeParse({ ...body, phone: normalizeIndianMobile(String(body?.phone ?? "")) });
        if (!parsed.success) return NextResponse.json({ status: "error", code: "invalid", message: parsed.error.issues[0].message }, { status: 400 });

        const result = await createTechnician(scope, parsed.data);
        if (!result.ok) return respond(result, "");
        return NextResponse.json({ status: "success", message: "Technician created", data: await getTechnician(scope, result.data) });
    } catch (error) {
        return serverError("technician create failed", error);
    }
}
