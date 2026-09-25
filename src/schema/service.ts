import { z } from "zod";
import { APPLIANCE_CATEGORIES, SUB_TYPES } from "@/constants/appliances";

export const ServiceInputSchema = z
    .object({
        applianceCategory: z.enum(APPLIANCE_CATEGORIES),
        applianceSubType: z.string().min(1, "Choose a type"),
        serviceType: z.string().trim().min(2, "Enter a service name").max(80),
        price: z.number({ invalid_type_error: "Enter a price" }).int("Whole rupees only").min(0).max(1000000),
        warrantyDurationDays: z
            .number({ invalid_type_error: "Enter days (0 for none)" })
            .int("Whole days only")
            .min(0)
            .max(3650),
        image: z
            .string()
            .trim()
            .max(500)
            .refine((v) => v === "" || v.startsWith("/") || /^https:\/\//.test(v), "Use a path like /image.jpg or an https link"),
        desc: z.array(z.string().trim().min(1).max(300)).max(10),
        isActive: z.boolean(),
    })
    .refine((v) => SUB_TYPES[v.applianceCategory].includes(v.applianceSubType), {
        message: "Not a valid type for this appliance",
        path: ["applianceSubType"],
    });

export type ServiceInput = z.infer<typeof ServiceInputSchema>;
