import { NextRequest } from "next/server";
import { addBookingNote } from "@/lib/domain/adminBookings";
import { getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { respond, serverError } from "@/helpers/respond";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scope = await getAdminScope(request);
        if (!scope) return unauthorizedResponse();
        return respond(await addBookingNote(scope, params.id, await request.json()), "Note added");
    } catch (error) {
        return serverError("booking note failed", error);
    }
}
