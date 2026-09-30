import { NextRequest, NextResponse } from "next/server";
import { createStore, listStores } from "@/lib/domain/stores";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

export async function GET(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: await listStores(scope) });
    } catch (error) {
        return serverError("stores list failed", error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await createStore(scope, await request.json()), "Store created");
    } catch (error) {
        return serverError("store create failed", error);
    }
}
