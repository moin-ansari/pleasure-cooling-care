import { NextRequest, NextResponse } from "next/server";
import { listTemplates } from "@/lib/domain/notifications";
import { forbiddenResponse, getAdminScope, unauthorizedResponse } from "@/helpers/requireAdmin";
import { isOwner } from "@/lib/scope";

// The wording and setup state of every message. Owner only: it reveals how the server is configured.
export async function GET(request: NextRequest) {
    const scope = await getAdminScope(request);
    if (!scope) return unauthorizedResponse();
    if (!isOwner(scope)) return forbiddenResponse();
    return NextResponse.json({ status: "success", data: listTemplates() });
}
