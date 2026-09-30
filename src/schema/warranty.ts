import { z } from "zod";

export const ClaimInputSchema = z.object({
    bookingRef: z.string().trim().min(6).max(20),
    mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit mobile number"),
    issue: z.string().trim().min(10, "Tell us what is wrong, in a few words").max(500),
});

export const ApproveClaimSchema = z.object({
    // Local India time from a datetime-local input, "YYYY-MM-DDTHH:mm".
    arrivalAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose the arrival date and time"),
    // Defaults to the technician who did the original job.
    technicianId: z.string().min(1).optional(),
});

export const RejectClaimSchema = z.object({
    reason: z.string().trim().min(3, "Tell the customer why the claim is declined").max(200),
});
