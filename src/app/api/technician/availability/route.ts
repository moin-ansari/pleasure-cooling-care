import { NextRequest, NextResponse } from "next/server";
import { getMyAvailability, setMyAvailability } from "@/lib/domain/availability";
import { getTechnicianId, technicianUnauthorized } from "@/lib/technicianAuth";
import { respond, serverError } from "@/helpers/respond";

export async function GET(request: NextRequest) {
    try {
        const technicianId = await getTechnicianId(request);
        if (!technicianId) return technicianUnauthorized();
        return NextResponse.json({ status: "success", data: await getMyAvailability(technicianId) });
    } catch (error) {
        return serverError("technician availability failed", error);
    }
}

// { date: "YYYY-MM-DD", available: boolean }
export async function PUT(request: NextRequest) {
    try {
        const technicianId = await getTechnicianId(request);
        if (!technicianId) return technicianUnauthorized();
        return respond(await setMyAvailability(technicianId, await request.json()), (d) => (d.off ? (d.jobs > 0 ? `Marked as not available. You still have ${d.jobs} ${d.jobs === 1 ? "job" : "jobs"} that day, so tell the office.` : "Marked as not available") : "Marked as available"));
    } catch (error) {
        return serverError("technician availability update failed", error);
    }
}
