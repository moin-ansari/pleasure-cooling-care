import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { rankFor } from "@/lib/rank";
import { isOwner, type AdminScope } from "@/lib/scope";
import { CancelCutoffSchema, RankSettingsSchema } from "@/schema/settings";
import { getRankThresholds } from "./reviews";
import { fail, ok, type Result } from "./result";

export interface AdminSettings {
    // Only the owner can change the business-wide rules. A co-admin sees them but cannot edit.
    canEditGlobal: boolean;
    cancelBlockedFrom: "CONFIRMED" | "ARRIVING" | "WORKING";
    ranks: { silver: { minJobs: number; minRating: number }; gold: { minJobs: number; minRating: number }; diamond: { minJobs: number; minRating: number } };
    // The admin's own store, for the new-booking alert number. The owner manages every store's number on the Stores screen.
    store: { id: string; name: string; adminAlertPhone: string | null } | null;
}

export async function getAdminSettings(scope: AdminScope): Promise<AdminSettings> {
    const [row, t, store] = await Promise.all([
        db.settings.findUnique({ where: { id: 1 }, select: { cancelBlockedFrom: true } }),
        getRankThresholds(),
        scope.storeIds ? db.store.findUnique({ where: { id: scope.storeIds[0] }, select: { id: true, name: true, adminAlertPhone: true } }) : db.store.findFirst({ where: { isMain: true }, select: { id: true, name: true, adminAlertPhone: true } }),
    ]);
    const cutoff = row?.cancelBlockedFrom;
    return {
        canEditGlobal: isOwner(scope),
        cancelBlockedFrom: cutoff === "CONFIRMED" || cutoff === "WORKING" ? cutoff : "ARRIVING",
        ranks: { silver: t.SILVER, gold: t.GOLD, diamond: t.DIAMOND },
        store,
    };
}

export async function updateCancelCutoff(scope: AdminScope, raw: unknown): Promise<Result<{ cancelBlockedFrom: string }>> {
    if (!isOwner(scope)) return fail("forbidden", "Only the owner can do this");
    const adminId = scope.adminId;
    const parsed = CancelCutoffSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", "Choose when customers can no longer cancel");
    const before = (await getAdminSettings(scope)).cancelBlockedFrom;
    await db.settings.upsert({ where: { id: 1 }, update: { cancelBlockedFrom: parsed.data.cancelBlockedFrom }, create: { id: 1, cancelBlockedFrom: parsed.data.cancelBlockedFrom } });
    await logAudit({ actorType: "admin", actorId: adminId, action: "settings.cancelCutoff", entity: "Settings", entityId: "1", before: { cancelBlockedFrom: before }, after: parsed.data });
    return ok(parsed.data);
}

// New thresholds apply to every technician straight away.
export async function updateRankSettings(scope: AdminScope, raw: unknown): Promise<Result<{ updated: number }>> {
    if (!isOwner(scope)) return fail("forbidden", "Only the owner can do this");
    const adminId = scope.adminId;
    const parsed = RankSettingsSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const v = parsed.data;
    const before = (await getAdminSettings(scope)).ranks;

    const data = {
        silverMinJobs: v.silver.minJobs,
        silverMinRating: v.silver.minRating,
        goldMinJobs: v.gold.minJobs,
        goldMinRating: v.gold.minRating,
        diamondMinJobs: v.diamond.minJobs,
        diamondMinRating: v.diamond.minRating,
    };
    await db.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });

    const thresholds = { SILVER: v.silver, GOLD: v.gold, DIAMOND: v.diamond };
    const technicians = await db.technician.findMany({ select: { id: true, rank: true, jobsCompletedCount: true, averageRating: true } });
    let updated = 0;
    for (const t of technicians) {
        const rank = rankFor(t.jobsCompletedCount, t.averageRating, thresholds);
        if (rank !== t.rank) {
            await db.technician.update({ where: { id: t.id }, data: { rank } });
            updated++;
        }
    }

    await logAudit({ actorType: "admin", actorId: adminId, action: "settings.ranks", entity: "Settings", entityId: "1", before, after: v });
    return ok({ updated });
}
