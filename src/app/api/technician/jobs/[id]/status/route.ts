import { NextRequest, NextResponse } from "next/server";
import { updateJobStatus } from "@/lib/domain/technicianJobs";
import { getTechnicianId, technicianUnauthorized } from "@/lib/technicianAuth";
import * as Sentry from "@sentry/nextjs";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const technicianId = await getTechnicianId(request);
        if (!technicianId) return technicianUnauthorized();

        const result = await updateJobStatus(technicianId, params.id, await request.json());
        if (!result.ok) {
            return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: result.code === "not_found" ? 404 : 400 });
        }

        return NextResponse.json({ status: "success", message: "Job updated", data: result.data });
    } catch (error: any) {
        console.error("technician status failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
