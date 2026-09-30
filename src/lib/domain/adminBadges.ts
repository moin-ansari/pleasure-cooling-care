import { db } from "@/lib/db";
import { bookingWhere, storeOnlyWhere, type AdminScope } from "@/lib/scope";

export interface AdminBadges {
    newBookings: number;
    pendingClaims: number;
    failedMessages: number;
}

// Small counts shown on the admin navigation so nothing waiting for the admin goes unnoticed.
export async function getAdminBadges(scope: AdminScope): Promise<AdminBadges> {
    const [newBookings, pendingClaims, failedMessages] = await Promise.all([
        db.booking.count({ where: { ...bookingWhere(scope), status: "NEW" } }),
        db.warrantyClaim.count({ where: { status: "PENDING", originalBooking: bookingWhere(scope) } }),
        db.notificationLog.count({ where: { ...storeOnlyWhere(scope), status: "FAILED", createdAt: { gte: new Date(Date.now() - 3 * 86400000) } } }),
    ]);
    return { newBookings, pendingClaims, failedMessages };
}
