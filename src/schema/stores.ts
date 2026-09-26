import { z } from "zod";

const percent = (label: string) => z.number({ invalid_type_error: `Enter ${label}` }).finite().multipleOf(0.01, "At most 2 decimal places").min(0, "Cannot be negative").max(100, "Cannot be more than 100");
const phone = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit mobile number");

const StoreBase = z.object({
    name: z.string().trim().min(2, "Enter a store name").max(60),
    technicianRatePercent: percent("the technician percentage"),
    ownerRatePercent: percent("your percentage"),
    flatAmount: z.number({ invalid_type_error: "Enter the flat amount" }).finite().multipleOf(0.01, "At most 2 decimal places").min(0, "Cannot be negative").max(100000),
    adminAlertPhone: z.union([phone, z.literal("")]).optional(),
});

const ownerWithinTotal = (v: { technicianRatePercent: number; ownerRatePercent: number }) => v.ownerRatePercent <= v.technicianRatePercent;
const ownerMessage = { message: "Your share cannot be more than what the technician pays", path: ["ownerRatePercent"] };

export const StoreInputSchema = StoreBase.refine(ownerWithinTotal, ownerMessage);
export const StoreUpdateSchema = StoreBase.extend({ isActive: z.boolean() }).refine(ownerWithinTotal, ownerMessage);

export const CoAdminCreateSchema = z.object({
    name: z.string().trim().min(2, "Enter the name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: z.union([phone, z.literal("")]).optional(),
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
    storeId: z.string().min(1, "Choose a store"),
});

export const CoAdminUpdateSchema = z.object({
    name: z.string().trim().min(2, "Enter the name").max(80),
    phone: z.union([phone, z.literal("")]).optional(),
    isActive: z.boolean(),
    storeId: z.string().min(1, "Choose a store"),
    newPassword: z.union([z.string().min(8, "Password must be at least 8 characters").max(100), z.literal("")]).optional(),
});

export const AssignCitySchema = z.object({ storeId: z.string().min(1, "Choose a store") });

// A store's own alert number is the one thing a co-admin may change about their store.
export const StoreAlertSchema = z.object({ adminAlertPhone: z.union([phone, z.literal("")]) });

export const StorePaymentSchema = z.object({
    kind: z.enum(["PAYMENT", "ADJUSTMENT"]),
    amount: z.number({ invalid_type_error: "Enter the amount" }).finite().multipleOf(0.01, "At most 2 decimal places").refine((v) => v !== 0, "Amount cannot be zero"),
    note: z.string().trim().max(200).optional(),
});
