import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { APPLIANCE_CATEGORIES, type ApplianceCategoryValue } from "@/constants/appliances";
import { ServiceInputSchema } from "@/schema/service";
import { createService, listServices } from "@/lib/domain/services";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";
import { STOREFRONT_TAG } from "@/lib/storefront";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
    try {
        const params = request.nextUrl.searchParams;
        const categoryParam = params.get("category");
        const category = APPLIANCE_CATEGORIES.find((c) => c === categoryParam) as ApplianceCategoryValue | undefined;

        // inactive services are visible to admins only
        const wantsAll = params.get("all") === "true";
        if (wantsAll && !(await getAdminId(request))) return unauthorizedResponse();

        const data = await listServices({ activeOnly: !wantsAll, category });
        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message });
    }
}

export async function POST(request: NextRequest) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const parsed = ServiceInputSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ status: "error", message: parsed.error.issues[0].message });
        }

        const service = await createService(parsed.data);
        revalidateTag(STOREFRONT_TAG);
        await logAudit({ actorType: "admin", actorId: adminId, action: "service.create", entity: "Service", entityId: service.id, after: service });

        return NextResponse.json({ status: "success", message: "Service created", data: service });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ status: "error", message: "This service already exists for that appliance and type" });
        }
        return NextResponse.json({ status: "error", message: error.message });
    }
}
