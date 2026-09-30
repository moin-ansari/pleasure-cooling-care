import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { storeOnlyWhere, type AdminScope } from "@/lib/scope";
import { deleteIdProof, readIdProof, saveIdProof } from "@/lib/storage";
import { fail, ok, type Result } from "./result";

// The photo of a technician's ID document. Only admins with access to that technician can open it.

export async function setIdProof(scope: AdminScope, technicianId: string, bytes: Uint8Array): Promise<Result<{ hasIdProof: true }>> {
    const technician = await db.technician.findFirst({ where: { id: technicianId, ...storeOnlyWhere(scope) }, select: { idImageUrl: true } });
    if (!technician) return fail("not_found", "Technician not found");

    const saved = await saveIdProof(bytes);
    if (!saved.ok) return saved;

    await db.technician.update({ where: { id: technicianId }, data: { idImageUrl: saved.data.key } });
    if (technician.idImageUrl) await deleteIdProof(technician.idImageUrl);
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "technician.idProofUpload", entity: "Technician", entityId: technicianId });
    return ok({ hasIdProof: true });
}

export async function getIdProof(scope: AdminScope, technicianId: string): Promise<Result<{ bytes: Uint8Array; type: string }>> {
    const technician = await db.technician.findFirst({ where: { id: technicianId, ...storeOnlyWhere(scope) }, select: { idImageUrl: true } });
    if (!technician?.idImageUrl) return fail("not_found", "No ID document on file");
    const doc = await readIdProof(technician.idImageUrl);
    if (doc.ok) await logAudit({ actorType: "admin", actorId: scope.adminId, action: "technician.idProofView", entity: "Technician", entityId: technicianId });
    return doc;
}

export async function removeIdProof(scope: AdminScope, technicianId: string): Promise<Result<null>> {
    const technician = await db.technician.findFirst({ where: { id: technicianId, ...storeOnlyWhere(scope) }, select: { idImageUrl: true } });
    if (!technician) return fail("not_found", "Technician not found");
    if (!technician.idImageUrl) return ok(null);
    await deleteIdProof(technician.idImageUrl);
    await db.technician.update({ where: { id: technicianId }, data: { idImageUrl: null } });
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "technician.idProofRemove", entity: "Technician", entityId: technicianId });
    return ok(null);
}
