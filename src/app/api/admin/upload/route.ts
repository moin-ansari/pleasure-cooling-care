import { NextRequest, NextResponse } from "next/server";
import { IMAGE_FOLDERS, MAX_IMAGE_BYTES, saveImage, type ImageFolder } from "@/lib/storage";
import { getAdminScope, forbiddenResponse, unauthorizedResponse } from "@/helpers/requireAdmin";
import { isOwner } from "@/lib/scope";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const form = await request.formData();
        const file = form.get("file");
        const folder = String(form.get("folder") ?? "services") as ImageFolder;
        if (!(file instanceof File)) return NextResponse.json({ status: "error", message: "Choose an image" }, { status: 400 });
        if (folder === "services" && !isOwner(scope)) return forbiddenResponse();
        if (!IMAGE_FOLDERS.includes(folder)) return NextResponse.json({ status: "error", message: "Unknown folder" }, { status: 400 });
        if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ status: "error", code: "too_large", message: "The image is larger than 2 MB. Choose a smaller one." }, { status: 413 });

        const result = await saveImage(new Uint8Array(await file.arrayBuffer()), folder);
        if (!result.ok) {
            return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_configured" || result.code === "storage_failed" ? 503 : 400 });
        }
        return NextResponse.json({ status: "success", message: "Image uploaded", data: result.data });
    } catch (error: any) {
        console.error("upload failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
