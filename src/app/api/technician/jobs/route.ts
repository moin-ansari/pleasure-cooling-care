import { NextRequest, NextResponse } from "next/server";
import { listJobs } from "@/lib/domain/technicianJobs";
import { getTechnicianId, technicianUnauthorized } from "@/lib/technicianAuth";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
    try {
        const technicianId = await getTechnicianId(request);
        if (!technicianId) return technicianUnauthorized();

        return NextResponse.json({ status: "success", data: await listJobs(technicianId) });
    } catch (error: any) {
        console.error("technician jobs failed", error);
        Sentry.captureException(error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
