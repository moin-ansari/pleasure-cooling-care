import { NextRequest } from "next/server";
import { editBookingDetails } from "@/lib/domain/adminBookings";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await editBookingDetails(scope, params.id, await request.json()), "Booking updated");
    } catch (error) {
        return serverError("booking edit failed", error);
    }
}
