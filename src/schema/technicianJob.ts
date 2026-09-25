import { z } from "zod";

const amount = (label: string) =>
    z.number({ invalid_type_error: `Enter ${label}` }).int("Whole rupees only").min(0, "Cannot be negative").max(1000000);

// One shape per status a technician can move a job to.
export const JobStatusUpdateSchema = z.discriminatedUnion("status", [
    z.object({ status: z.literal("ARRIVING"), etaMinutes: z.number().int().min(5, "Choose at least 5 minutes").max(480) }),
    z.object({ status: z.literal("WORKING") }),
    z.object({ status: z.literal("DELAYED"), reason: z.string().trim().min(3, "Tell us why the job is delayed").max(200) }),
    z.object({
        status: z.literal("COMPLETED"),
        laborAmount: amount("the service charge"),
        partsAmount: amount("the parts amount"),
        amountCollected: amount("the amount collected"),
    }),
]);

export type JobStatusUpdate = z.infer<typeof JobStatusUpdateSchema>;
