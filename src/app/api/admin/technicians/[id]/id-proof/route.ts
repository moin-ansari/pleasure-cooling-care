import { NextRequest, NextResponse } from "next/server";
import { MAX_IMAGE_BYTES } from "@/lib/storage";
import { getIdProof, removeIdProof, setIdProof } from "@/lib/domain/technicianDocs";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError, statusFor } from "@/helpers/respond";

type Context = { params: { id: string } };

// The ID document is private. It is only ever sent to a signed-in admin who can see this technician, and never cached.
export async function GET(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const doc = await getIdProof(scope, params.id);
        if (!doc.ok) return NextResponse.json({ status: "error", code: doc.code, message: doc.message }, { status: statusFor(doc.code) });
        return new NextResponse(Buffer.from(doc.data.bytes), { headers: { "Content-Type": doc.data.type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    } catch (error) {
        return serverError("id proof read failed", error);
    }
}

export async function POST(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();

        const file = (await request.formData()).get("file");
        if (!(file instanceof File)) return NextResponse.json({ status: "error", code: "invalid", message: "Choose an image" }, { status: 400 });
        if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ status: "error", code: "too_large", message: "The image is larger than 2 MB. Choose a smaller one." }, { status: 413 });

        return respond(await setIdProof(scope, params.id, new Uint8Array(await file.arrayBuffer())), "ID document saved");
    } catch (error) {
        return serverError("id proof upload failed", error);
    }
}

export async function DELETE(request: NextRequest, { params }: Context) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await removeIdProof(scope, params.id), "ID document removed", { withData: false });
    } catch (error) {
        return serverError("id proof remove failed", error);
    }
}
