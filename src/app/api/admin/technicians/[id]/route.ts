import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { UpdateTechnicianSchema } from "@/schema/technician";
import { deleteTechnician, getTechnician, updateTechnician } from "@/lib/domain/technicians";
import { getAdminId, unauthorizedResponse } from "@/helpers/requireAdmin";
import { normalizeIndianMobile } from "@/lib/phone";
import { logAudit } from "@/lib/audit";

type Context = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Context) {
    try {
        if (!(await getAdminId(request))) return unauthorizedResponse();

        const technician = await getTechnician(params.id);
        if (!technician) return NextResponse.json({ status: "error", message: "Technician not found" });

        return NextResponse.json({ status: "success", data: technician });
    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message });
    }
}

export async function PUT(request: NextRequest, { params }: Context) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const body = await request.json();
        const parsed = UpdateTechnicianSchema.safeParse({ ...body, phone: normalizeIndianMobile(String(body?.phone ?? "")) });
        if (!parsed.success) return NextResponse.json({ status: "error", message: parsed.error.issues[0].message });

        const before = await getTechnician(params.id);
        if (!before) return NextResponse.json({ status: "error", message: "Technician not found" });

        await updateTechnician(params.id, parsed.data);

        const actions = ["technician.update"];
        if (parsed.data.newPin) actions.push("technician.pinReset");
        if (parsed.data.unlock) actions.push("technician.unlock");
        for (const action of actions) {
            await logAudit({
                actorType: "admin",
                actorId: adminId,
                action,
                entity: "Technician",
                entityId: params.id,
                before: action === "technician.update" ? { name: before.name, workEmail: before.workEmail, isActive: before.isActive } : undefined,
                after: action === "technician.update" ? { name: parsed.data.name, workEmail: parsed.data.workEmail, isActive: parsed.data.isActive } : undefined,
            });
        }

        return NextResponse.json({ status: "success", message: "Technician updated", data: await getTechnician(params.id) });
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ status: "error", message: "A technician with this work email already exists" });
        }
        return NextResponse.json({ status: "error", message: error.message });
    }
}

export async function DELETE(request: NextRequest, { params }: Context) {
    try {
        const adminId = await getAdminId(request);
        if (!adminId) return unauthorizedResponse();

        const before = await getTechnician(params.id);
        if (!before) return NextResponse.json({ status: "error", message: "Technician not found" });

        const result = await deleteTechnician(params.id);
        if (!result.ok) return NextResponse.json({ status: "error", message: result.message });

        await logAudit({ actorType: "admin", actorId: adminId, action: "technician.delete", entity: "Technician", entityId: params.id, before: { name: before.name, workEmail: before.workEmail } });

        return NextResponse.json({ status: "success", message: "Technician deleted" });
    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message });
    }
}
