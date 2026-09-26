import { NextRequest } from "next/server";
import { requestReassignment } from "@/lib/domain/technicianJobs";
import { getTechnicianId, technicianUnauthorized } from "@/lib/technicianAuth";
import { respond, serverError } from "@/helpers/respond";

// "I cannot attend this job." Asks the office to reassign it. A technician can never cancel.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const technicianId = await getTechnicianId(request);
        if (!technicianId) return technicianUnauthorized();
        return respond(await requestReassignment(technicianId, params.id, await request.json()), "The office has been told. They will reassign this job.");
    } catch (error) {
        return serverError("reassign request failed", error);
    }
}
