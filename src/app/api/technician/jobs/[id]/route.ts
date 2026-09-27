import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/domain/technicianJobs";
import { getTechnicianId, technicianUnauthorized } from "@/lib/technicianAuth";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const technicianId = await getTechnicianId(request);
        if (!technicianId) return technicianUnauthorized();

        // Jobs assigned to someone else look exactly like jobs that do not exist.
        const job = await getJob(technicianId, params.id);
        if (!job) return NextResponse.json({ status: "error", message: "Job not found" }, { status: 404 });

        return NextResponse.json({ status: "success", data: job });
    } catch (error: any) {
        console.error("technician job failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
