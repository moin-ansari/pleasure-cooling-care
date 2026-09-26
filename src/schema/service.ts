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

// Creating: the same service can be made for several types of the appliance at once (for example Split and Window).
export const ServiceCreateSchema = z
    .object({
        applianceCategory: z.enum(APPLIANCE_CATEGORIES),
        applianceSubTypes: z.array(z.string().min(1)).min(1, "Choose at least one type").max(10),
        serviceType: z.string().trim().min(2, "Enter a service name").max(80),
        price: z.number({ invalid_type_error: "Enter a price" }).int("Whole rupees only").min(0).max(1000000),
        warrantyDurationDays: z.number({ invalid_type_error: "Enter days (0 for none)" }).int("Whole days only").min(0).max(3650),
        image: z
            .string()
            .trim()
            .max(500)
            .refine((v) => v === "" || v.startsWith("/") || /^https:\/\//.test(v), "Use a path like /image.jpg or an https link"),
        desc: z.array(z.string().trim().min(1).max(300)).max(10),
        isActive: z.boolean(),
    })
    .refine((v) => v.applianceSubTypes.every((t) => SUB_TYPES[v.applianceCategory].includes(t)), {
        message: "Not a valid type for this appliance",
        path: ["applianceSubTypes"],
    });

// Quick edits from the list: any of these, nothing else.
export const ServicePatchSchema = z
    .object({
        price: z.number({ invalid_type_error: "Enter a price" }).int("Whole rupees only").min(0).max(1000000).optional(),
        warrantyDurationDays: z.number({ invalid_type_error: "Enter days (0 for none)" }).int("Whole days only").min(0).max(3650).optional(),
        isActive: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "Nothing to change");

export const BulkServiceSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("show"), ids: z.array(z.string().min(1)).min(1).max(100) }),
    z.object({ action: z.literal("hide"), ids: z.array(z.string().min(1)).min(1).max(100) }),
    z.object({ action: z.literal("setPrice"), ids: z.array(z.string().min(1)).min(1).max(100), value: z.number().int("Whole rupees only").min(0).max(1000000) }),
    // Percent: 10 raises prices by 10%, -10 lowers them. Amount: rupees added or taken off.
    z.object({ action: z.literal("changePercent"), ids: z.array(z.string().min(1)).min(1).max(100), value: z.number().min(-90).max(300) }),
    z.object({ action: z.literal("changeAmount"), ids: z.array(z.string().min(1)).min(1).max(100), value: z.number().int().min(-100000).max(100000) }),
]);

export type ServiceCreateInput = z.infer<typeof ServiceCreateSchema>;
export type ServicePatchInput = z.infer<typeof ServicePatchSchema>;
export type BulkServiceInput = z.infer<typeof BulkServiceSchema>;

// New price after a bulk change. Whole rupees, never below zero. Kept here so it can be unit tested.
export function bulkPrice(current: number, action: BulkServiceInput["action"], value: number): number {
    const next = action === "setPrice" ? value : action === "changePercent" ? Math.round(current * (1 + value / 100)) : current + value;
    return Math.max(0, Math.min(1000000, next));
}
