import { db } from "@/lib/db";

export interface AdminBadges {
    newBookings: number;
    pendingClaims: number;
    failedMessages: number;
}

// Small counts shown on the admin navigation so nothing waiting for the admin goes unnoticed.
export async function getAdminBadges(): Promise<AdminBadges> {
    const [newBookings, pendingClaims, failedMessages] = await Promise.all([
        db.booking.count({ where: { status: "NEW" } }),
        db.warrantyClaim.count({ where: { status: "PENDING" } }),
        db.notificationLog.count({ where: { status: "FAILED", createdAt: { gte: new Date(Date.now() - 3 * 86400000) } } }),
    ]);
    return { newBookings, pendingClaims, failedMessages };
}
