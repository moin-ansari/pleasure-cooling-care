import { z } from "zod";

export const AssignInputSchema = z.object({
    technicianId: z.string().min(1, "Choose a technician"),
    // Local India time from a datetime-local input, "YYYY-MM-DDTHH:mm".
    arrivalAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose the arrival date and time"),
});

export const CancelInputSchema = z.object({
    reason: z.string().trim().min(3, "Tell us why the booking is cancelled").max(200),
});

export const PriceInputSchema = z.object({
    price: z.number({ invalid_type_error: "Enter a price" }).int("Whole rupees only").min(0, "Cannot be negative").max(1000000),
    note: z.string().trim().max(200).optional(),
});
