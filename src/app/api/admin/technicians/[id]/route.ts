import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { UpdateTechnicianSchema } from "@/schema/technician";
import { deleteTechnician, getTechnician, updateTechnician } from "@/lib/domain/technicians";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";
import { normalizeIndianMobile } from "@/lib/phone";
import { STOREFRONT_TAG } from "@/lib/storefront";

type Context = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const technician = await getTechnician(scope, params.id);
        if (!technician) return NextResponse.json({ status: "error", code: "not_found", message: "Technician not found" }, { status: 404 });
        return NextResponse.json({ status: "success", data: technician });
    } catch (error) {
        return serverError("technician get failed", error);
    }
}

export async function PUT(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const body = await request.json();
        const parsed = UpdateTechnicianSchema.safeParse({ ...body, phone: normalizeIndianMobile(String(body?.phone ?? "")) });
        if (!parsed.success) return NextResponse.json({ status: "error", code: "invalid", message: parsed.error.issues[0].message }, { status: 400 });

        const result = await updateTechnician(scope, params.id, parsed.data);
        if (!result.ok) return respond(result, "");
        // Cheap and infrequent enough to just always refresh the public technicians list, rather than
        // tracking whether name/photo/showOnWebsite specifically changed.
        revalidateTag(STOREFRONT_TAG);
        return NextResponse.json({ status: "success", message: "Technician updated", data: await getTechnician(scope, params.id) });
    } catch (error) {
        return serverError("technician update failed", error);
    }
}

export async function DELETE(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await deleteTechnician(scope, params.id), "Technician deleted", { withData: false });
    } catch (error) {
        return serverError("technician delete failed", error);
    }
}
