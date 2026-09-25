import { z } from "zod";

export const ReviewInputSchema = z.object({
    bookingRef: z.string().trim().min(6).max(20),
    mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit mobile number"),
    rating: z.number({ invalid_type_error: "Choose a rating" }).int().min(1, "Choose a rating").max(5, "Choose a rating"),
    comment: z.string().trim().max(500, "Keep the review under 500 characters").optional(),
});

export const ReviewVisibilitySchema = z.object({ isPublic: z.boolean() });
