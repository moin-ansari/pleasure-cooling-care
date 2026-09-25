import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { ServiceInputSchema } from "@/schema/service";
import { deleteService, getService, updateService } from "@/lib/domain/services";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";
import { STOREFRONT_TAG } from "@/lib/storefront";
import { logAudit } from "@/lib/audit";

type Context = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Context) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();

        const service = await getService(params.id);
        if (!service) return NextResponse.json({ status: "error", message: "Service not found" });

        return NextResponse.json({ status: "success", data: service });
    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message });
    }
}

export async function PUT(request: NextRequest, { params }: Context) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const parsed = ServiceInputSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ status: "error", message: parsed.error.issues[0].message });
        }

        const before = await getService(params.id);
        if (!before) return NextResponse.json({ status: "error", message: "Service not found" });

        const service = await updateService(params.id, parsed.data);
        revalidateTag(STOREFRONT_TAG);
        await logAudit({ actorType: "admin", actorId: adminId, action: "service.update", entity: "Service", entityId: service.id, before, after: service });

        return NextResponse.json({ status: "success", message: "Service updated", data: service });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ status: "error", message: "This service already exists for that appliance and type" });
        }
        return NextResponse.json({ status: "error", message: error.message });
    }
}

export async function DELETE(request: NextRequest, { params }: Context) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const before = await getService(params.id);
        if (!before) return NextResponse.json({ status: "error", message: "Service not found" });

        await deleteService(params.id);
        revalidateTag(STOREFRONT_TAG);
        await logAudit({ actorType: "admin", actorId: adminId, action: "service.delete", entity: "Service", entityId: params.id, before });

        return NextResponse.json({ status: "success", message: "Service deleted" });
    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message });
    }
}
