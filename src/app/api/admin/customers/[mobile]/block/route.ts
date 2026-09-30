import { NextRequest } from "next/server";
import { blockCustomer, unblockCustomer } from "@/lib/domain/customers";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

type Context = { params: { mobile: string } };

// Owner only.
export async function POST(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        const body = await request.json().catch(() => ({}));
        return respond(await blockCustomer(scope, params.mobile, body?.reason), "This number can no longer book", { withData: false });
    } catch (error) {
        return serverError("block failed", error);
    }
}

export async function DELETE(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await unblockCustomer(scope, params.mobile), "This number can book again", { withData: false });
    } catch (error) {
        return serverError("unblock failed", error);
    }
}
