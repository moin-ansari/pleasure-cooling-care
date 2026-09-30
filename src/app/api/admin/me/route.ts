import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { areaWhere, isOwner } from "@/lib/scope";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { serverError } from "@/helpers/respond";

// Who is signed in, and which cities they can pick in the switcher. The screens use this to show or hide owner-only parts.
export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const [cities, store] = await Promise.all([
            db.serviceArea.findMany({ where: areaWhere(scope), select: { id: true, district: true, isActive: true }, orderBy: { district: "asc" } }),
            scope.storeIds ? db.store.findUnique({ where: { id: scope.storeIds[0] }, select: { id: true, name: true } }) : Promise.resolve(null),
        ]);
        return NextResponse.json({
            status: "success",
            data: { name: scope.name, role: scope.role, isOwner: isOwner(scope), store, cities, selectedCityId: scope.cityId },
        });
    } catch (error) {
        return serverError("admin me failed", error);
    }
}
