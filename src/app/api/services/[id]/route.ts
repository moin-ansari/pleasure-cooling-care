import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { deleteService, getService, patchService, updateService } from "@/lib/domain/services";
import { getAdminId, unauthorizedResponse, getAdminScope, forbiddenResponse } from "@/helpers/requireAdmin";
import { isOwner } from "@/lib/scope";
import { STOREFRONT_TAG } from "@/lib/storefront";
import * as Sentry from "@sentry/nextjs";

type Context = { params: { id: string } };

const statusFor = (code: string) => (code === "not_found" ? 404 : code === "duplicate" || code === "in_use" ? 409 : 400);

export async function GET(request: NextRequest, { params }: Context) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();

        const service = await getService(params.id);
        if (!service) return NextResponse.json({ status: "error", message: "Service not found" }, { status: 404 });

        return NextResponse.json({ status: "success", data: service });
    } catch (error: any) {
        console.error("service get failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        if (!isOwner(scope)) return forbiddenResponse();
        const adminId = scope.adminId;

        const result = await updateService(params.id, adminId, await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: statusFor(result.code) });

        revalidateTag(STOREFRONT_TAG);
        return NextResponse.json({ status: "success", message: "Service updated", data: result.data });
    } catch (error: any) {
        console.error("service update failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}

// Quick edit: price, guarantee days or visibility.
export async function PATCH(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        if (!isOwner(scope)) return forbiddenResponse();
        const adminId = scope.adminId;

        const result = await patchService(params.id, adminId, await request.json());
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: statusFor(result.code) });

        revalidateTag(STOREFRONT_TAG);
        return NextResponse.json({ status: "success", message: "Saved", data: result.data });
    } catch (error: any) {
        console.error("service patch failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        if (!isOwner(scope)) return forbiddenResponse();
        const adminId = scope.adminId;

        const result = await deleteService(params.id, adminId);
        if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: statusFor(result.code) });

        revalidateTag(STOREFRONT_TAG);
        return NextResponse.json({ status: "success", message: "Service deleted" });
    } catch (error: any) {
        console.error("service delete failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
