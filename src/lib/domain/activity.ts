import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ACTIVITY_GROUPS, describeAction, type ActivityGroupKey } from "@/constants/activity";
import { isOwner, type AdminScope } from "@/lib/scope";
import { fail, ok, type Result } from "./result";

const PAGE_SIZE = 30;

export interface ActivityItem {
    id: string;
    createdAt: string;
    action: string;
    label: string;
    actorName: string;
    actorType: string;
    entity: string;
    entityId: string | null;
    // A place in the app that shows the thing that was changed, when there is one.
    href: string | null;
    // Short "before" and "after" lines for the change, never anything secret.
    details: { before: string | null; after: string | null };
}

export interface ActivityList {
    items: ActivityItem[];
    page: number;
    pageCount: number;
    total: number;
}

const SECRET_KEYS = new Set(["pin", "password", "newPin", "pinHash", "accountNumber", "ifsc", "idNumber"]);

function summarise(value: unknown): string | null {
    if (!value || typeof value !== "object") return null;
    const parts = Object.entries(value as Record<string, unknown>)
        .filter(([k, v]) => !SECRET_KEYS.has(k) && v !== null && v !== undefined && typeof v !== "object")
        .map(([k, v]) => `${k}: ${String(v)}`);
    return parts.length ? parts.join(", ").slice(0, 300) : null;
}

const hrefFor = (entity: string, id: string | null): string | null => {
    if (!id) return null;
    if (entity === "Booking") return `/admin/bookings/${id}`;
    if (entity === "Technician") return `/admin/technicians/${id}`;
    if (entity === "Service") return `/admin/services/${id}`;
    if (entity === "Store") return `/admin/stores/${id}`;
    if (entity === "BlockedPhone") return `/admin/customers/${id}`;
    return null;
};

// Everything that was changed in the app, newest first. Owner only.
export async function listActivity(scope: AdminScope, options: { group?: ActivityGroupKey; q?: string; page?: number }): Promise<Result<ActivityList>> {
    if (!isOwner(scope)) return fail("forbidden", "Only the owner can do this");
    const page = Math.max(1, options.page ?? 1);
    const group = ACTIVITY_GROUPS.find((g) => g.key === options.group) ?? ACTIVITY_GROUPS[0];
    const q = (options.q ?? "").trim();

    const where: Prisma.AuditLogWhereInput = {
        ...(group.prefixes.length ? { OR: group.prefixes.map((p) => ({ action: { startsWith: p } })) } : {}),
        ...(q ? { AND: [{ OR: [{ action: { contains: q, mode: "insensitive" } }, { entityId: { contains: q } }] }] } : {}),
    };

    const [rows, total] = await Promise.all([
        db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
        db.auditLog.count({ where }),
    ]);

    const adminIds = Array.from(new Set(rows.filter((r) => r.actorType === "admin" && r.actorId).map((r) => r.actorId!)));
    const technicianIds = Array.from(new Set(rows.filter((r) => r.actorType === "technician" && r.actorId).map((r) => r.actorId!)));
    const [admins, technicians] = await Promise.all([
        adminIds.length ? db.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true, email: true, role: true, store: { select: { name: true } } } }) : [],
        technicianIds.length ? db.technician.findMany({ where: { id: { in: technicianIds } }, select: { id: true, name: true } }) : [],
    ]);
    const adminName = new Map(admins.map((a) => [a.id, `${a.name || a.email}${a.role === "CO_ADMIN" && a.store ? ` (${a.store.name})` : ""}`]));
    const technicianName = new Map(technicians.map((t) => [t.id, t.name]));

    return ok({
        items: rows.map((r) => ({
            id: r.id,
            createdAt: r.createdAt.toISOString(),
            action: r.action,
            label: describeAction(r.action),
            actorName: r.actorType === "admin" ? adminName.get(r.actorId ?? "") ?? "Admin" : r.actorType === "technician" ? technicianName.get(r.actorId ?? "") ?? "Technician" : r.actorType === "customer" ? "Customer" : "System",
            actorType: r.actorType,
            entity: r.entity,
            entityId: r.entityId,
            href: hrefFor(r.entity, r.entityId),
            details: { before: summarise(r.before), after: summarise(r.after) },
        })),
        page,
        pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        total,
    });
}
