import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { APPLIANCE_CATEGORIES, type ApplianceCategoryValue } from "@/constants/appliances";
import { createServices, listServices, listServicesForAdmin } from "@/lib/domain/services";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";
import { STOREFRONT_TAG } from "@/lib/storefront";

export async function GET(request: NextRequest) {
    try {
        const params = request.nextUrl.searchParams;
        const categoryParam = params.get("category");
        const category = APPLIANCE_CATEGORIES.find((c) => c === categoryParam) as ApplianceCategoryValue | undefined;

        // Hidden services, and booking counts, are for admins only.
        if (params.get("all") === "true") {
            if (!(await getAdminId(request))) return unauthorizedResponse();
            return NextResponse.json({ status: "success", data: await listServicesForAdmin() });
        }

        return NextResponse.json({ status: "success", data: await listServices({ activeOnly: true, category }) });
    } catch (error: any) {
        console.error("services list failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const result = await createServices(adminId, await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "duplicate" ? 409 : 400 });

        revalidateTag(STOREFRONT_TAG);
        const n = result.data.length;
        return NextResponse.json({ status: "success", message: n === 1 ? "Service created" : `${n} services created`, data: result.data });
    } catch (error: any) {
        console.error("service create failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
