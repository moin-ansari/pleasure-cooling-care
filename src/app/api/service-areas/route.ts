import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { listServiceAreas } from "@/lib/domain/serviceAreas";
import { ServiceAreaInputSchema } from "@/schema/serviceArea";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";
import { STOREFRONT_TAG } from "@/lib/storefront";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
    try {
        // hidden districts are visible to admins only
        const wantsAll = request.nextUrl.searchParams.get("all") === "true";
        if (wantsAll && !(await getAdminId(request))) return unauthorizedResponse();

        const data = await listServiceAreas({ activeOnly: !wantsAll });
        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message });
    }
}

export async function POST(request: NextRequest) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const parsed = ServiceAreaInputSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ status: "error", message: parsed.error.issues[0].message });

        const area = await db.serviceArea.create({ data: parsed.data });
        revalidateTag(STOREFRONT_TAG);
        await logAudit({ actorType: "admin", actorId: adminId, action: "serviceArea.create", entity: "ServiceArea", entityId: area.id, after: area });

        return NextResponse.json({ status: "success", message: "District added", data: area });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ status: "error", message: "This district is already in the list" });
        }
        return NextResponse.json({ status: "error", message: error.message });
    }
}
