import { z } from "zod";

export const ServiceAreaInputSchema = z.object({
    state: z.string().trim().min(2, "Enter the state").max(60),
    district: z.string().trim().min(2, "Enter the district").max(60),
    isActive: z.boolean(),
});

export type ServiceAreaInput = z.infer<typeof ServiceAreaInputSchema>;
