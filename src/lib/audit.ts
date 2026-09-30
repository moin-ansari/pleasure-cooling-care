import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

interface AuditEntry {
    actorType: "admin" | "technician" | "customer" | "system";
    actorId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    before?: object;
    after?: object;
}

// Best effort: a failed audit write never blocks the action being audited.
export async function logAudit(entry: AuditEntry): Promise<void> {
    try {
        await db.auditLog.create({
            data: {
                ...entry,
                before: entry.before as Prisma.InputJsonObject | undefined,
                after: entry.after as Prisma.InputJsonObject | undefined,
            },
        });
    } catch (error) {
        console.error("audit log failed", error);
    }
}
