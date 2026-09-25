import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { ServiceAreaInputSchema } from "@/schema/serviceArea";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";
import { STOREFRONT_TAG } from "@/lib/storefront";
import { logAudit } from "@/lib/audit";

type Context = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Context) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const parsed = ServiceAreaInputSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ status: "error", message: parsed.error.issues[0].message });

        const before = await db.serviceArea.findUnique({ where: { id: params.id } });
        if (!before) return NextResponse.json({ status: "error", message: "District not found" });

        const area = await db.serviceArea.update({ where: { id: params.id }, data: parsed.data });
        revalidateTag(STOREFRONT_TAG);
        await logAudit({ actorType: "admin", actorId: adminId, action: "serviceArea.update", entity: "ServiceArea", entityId: area.id, before, after: area });

        return NextResponse.json({ status: "success", message: "District updated", data: area });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ status: "error", message: "This district is already in the list" });
        }
        return NextResponse.json({ status: "error", message: error.message });
    }
}

export async function DELETE(request: NextRequest, { params }: Context) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const before = await db.serviceArea.findUnique({ where: { id: params.id } });
        if (!before) return NextResponse.json({ status: "error", message: "District not found" });

        await db.serviceArea.delete({ where: { id: params.id } });
        revalidateTag(STOREFRONT_TAG);
        await logAudit({ actorType: "admin", actorId: adminId, action: "serviceArea.delete", entity: "ServiceArea", entityId: params.id, before });

        return NextResponse.json({ status: "success", message: "District deleted" });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            return NextResponse.json({ status: "error", message: "This district has bookings. Hide it instead of deleting." });
        }
        return NextResponse.json({ status: "error", message: error.message });
    }
}
