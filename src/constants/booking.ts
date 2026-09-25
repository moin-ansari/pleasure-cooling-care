export const TIME_SLOTS = ["10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM"] as const;

// Customers can book from today up to this many days ahead.
export const MAX_BOOKING_DAYS_AHEAD = 30;

// A slot must start at least this many minutes from now when booking for today.
export const MIN_LEAD_MINUTES = 60;

export type BookingStatusValue = "NEW" | "CONFIRMED" | "ARRIVING" | "WORKING" | "DELAYED" | "COMPLETED" | "CANCELLED";

// Order of an active booking's life; used for the cancellation cutoff.
export const ACTIVE_STATUS_ORDER: BookingStatusValue[] = ["NEW", "CONFIRMED", "ARRIVING", "WORKING", "DELAYED"];

export const STATUS_LABELS: Record<BookingStatusValue, string> = {
    NEW: "Received",
    CONFIRMED: "Confirmed",
    ARRIVING: "Technician on the way",
    WORKING: "Work in progress",
    DELAYED: "Delayed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

// What a technician may move a job to next. Cancelling is never in this list: only admin and customer cancel.
export const TECHNICIAN_TRANSITIONS: Record<BookingStatusValue, BookingStatusValue[]> = {
    NEW: [],
    CONFIRMED: ["ARRIVING"],
    ARRIVING: ["WORKING", "DELAYED"],
    WORKING: ["DELAYED", "COMPLETED"],
    DELAYED: ["WORKING", "COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
};

// Technician screens show DELAYED as "Pending".
export const TECHNICIAN_STATUS_LABELS: Record<BookingStatusValue, string> = {
    NEW: "New",
    CONFIRMED: "Confirmed",
    ARRIVING: "Arriving",
    WORKING: "Working",
    DELAYED: "Pending",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

// A customer may cancel while the booking is strictly before the cutoff status.
export function isCancellableByCustomer(status: BookingStatusValue, cutoff: BookingStatusValue): boolean {
    const index = ACTIVE_STATUS_ORDER.indexOf(status);
    const cutoffIndex = ACTIVE_STATUS_ORDER.indexOf(cutoff);
    return index !== -1 && cutoffIndex !== -1 && index < cutoffIndex;
}

// Admin booking lists. "active" covers everything between confirmed and finished.
export type BookingGroup = "new" | "active" | "completed" | "cancelled" | "all";

export const BOOKING_GROUP_STATUSES: Record<Exclude<BookingGroup, "all">, BookingStatusValue[]> = {
    new: ["NEW"],
    active: ["CONFIRMED", "ARRIVING", "WORKING", "DELAYED"],
    completed: ["COMPLETED"],
    cancelled: ["CANCELLED"],
};

export const BOOKING_GROUPS: BookingGroup[] = ["new", "active", "completed", "cancelled", "all"];

export const BOOKING_GROUP_LABELS: Record<BookingGroup, string> = {
    new: "New",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    all: "All",
};

// A new booking still unassigned after this long is highlighted in the admin list.
export const UNASSIGNED_ALERT_MINUTES = 15;

export const ADMIN_STATUS_LABELS: Record<BookingStatusValue, string> = {
    NEW: "New",
    CONFIRMED: "Confirmed",
    ARRIVING: "On the way",
    WORKING: "Working",
    DELAYED: "Delayed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

// Admin can still change these; completed and cancelled bookings are closed.
export const OPEN_STATUSES: BookingStatusValue[] = ["NEW", "CONFIRMED", "ARRIVING", "WORKING", "DELAYED"];
