import { z } from "zod";
import { TIME_SLOTS } from "@/constants/booking";

export const AssignInputSchema = z.object({
    technicianId: z.string().min(1, "Choose a technician"),
    // Local India time from a datetime-local input, "YYYY-MM-DDTHH:mm".
    arrivalAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose the arrival date and time"),
    // Set after the admin has seen that the technician marked that day as not available and chose to go ahead.
    acknowledgeOff: z.boolean().optional(),
});

export const CancelInputSchema = z.object({
    reason: z.string().trim().min(3, "Tell us why the booking is cancelled").max(200),
});

export const PriceInputSchema = z.object({
    price: z.number({ invalid_type_error: "Enter a price" }).int("Whole rupees only").min(0, "Cannot be negative").max(1000000),
    note: z.string().trim().max(200).optional(),
});

// Fixes to what the customer gave us. Every field is optional, but at least one must be sent.
export const BookingEditSchema = z
    .object({
        customerName: z.string().trim().min(2, "Enter the customer's name").max(80).optional(),
        streetAddress: z.string().trim().min(3, "Enter the address").max(200).optional(),
        town: z.string().trim().min(2, "Enter the town or locality").max(80).optional(),
        pincode: z.string().trim().regex(/^\d{6}$/, "Pincode has 6 digits").optional(),
        // The visit the customer asked for. Only before a technician is confirmed.
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date").optional(),
        time: z.enum(TIME_SLOTS).optional(),
    })
    .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Nothing to change" })
    .refine((v) => (v.date === undefined) === (v.time === undefined), { message: "Choose both the date and the time" });

export const NoteInputSchema = z.object({
    note: z.string().trim().min(2, "Write a note").max(300),
});
