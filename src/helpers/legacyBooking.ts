import type { Booking, BookingStatus, Prisma, ServiceArea } from "@prisma/client";

// Keeps the current admin bookings screens working on the new Booking table.
// Replaced when the admin booking screens are rebuilt.

const ACTIVE_STATUSES: BookingStatus[] = ["NEW", "CONFIRMED", "ARRIVING", "WORKING", "DELAYED"];

export function legacyStatusFilter(query: string | null): Prisma.BookingWhereInput {
    if (query === "completed") return { status: "COMPLETED" };
    if (query === "cancelled") return { status: "CANCELLED" };
    return { status: { in: ACTIVE_STATUSES } };
}

export function toLegacyBooking(b: Booking & { serviceArea: ServiceArea }) {
    return {
        _id: b.id,
        bookingRef: b.bookingRef,
        name: b.customerName,
        mobile: b.mobile,
        serviceType: b.serviceType,
        acType: b.applianceSubType,
        date: b.date,
        time: b.time,
        status: b.status === "COMPLETED" ? "completed" : b.status === "CANCELLED" ? "cancelled" : "pending",
        requestedDate: b.createdAt,
        streetAddress: b.streetAddress,
        city: b.serviceArea.district,
        state: b.serviceArea.state,
        zipcode: b.pincode,
        country: "India",
        price: b.price,
    };
}
