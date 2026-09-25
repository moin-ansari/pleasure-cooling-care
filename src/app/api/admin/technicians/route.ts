import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { CreateTechnicianSchema } from "@/schema/technician";
import { createTechnician, getTechnician, listTechnicians } from "@/lib/domain/technicians";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";
import { normalizeIndianMobile } from "@/lib/phone";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();
        return NextResponse.json({ status: "success", data: await listTechnicians() });
    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message });
    }
}

export async function POST(request: NextRequest) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const body = await request.json();
        const parsed = CreateTechnicianSchema.safeParse({ ...body, phone: normalizeIndianMobile(String(body?.phone ?? "")) });
        if (!parsed.success) return NextResponse.json({ status: "error", message: parsed.error.issues[0].message });

        const id = await createTechnician(parsed.data);
        // The audit record never holds the PIN or bank details.
        await logAudit({ actorType: "admin", actorId: adminId, action: "technician.create", entity: "Technician", entityId: id, after: { name: parsed.data.name, workEmail: parsed.data.workEmail } });

        return NextResponse.json({ status: "success", message: "Technician created", data: await getTechnician(id) });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ status: "error", message: "A technician with this work email already exists" });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return NextResponse.json({ status: "error", message: "One of the selected districts no longer exists" });
        }
        return NextResponse.json({ status: "error", message: error.message });
    }
}
