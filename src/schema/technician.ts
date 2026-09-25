import { z } from "zod";
import { APPLIANCE_CATEGORIES } from "@/constants/appliances";

// Six to ten digits. Longer than a phone unlock PIN because it guards a work account.
export const PinSchema = z.string().regex(/^\d{6,10}$/, "PIN must be 6 to 10 digits");

const optionalText = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .optional()
        .transform((v) => (v ? v : undefined));

const optionalInt = (min: number, max: number, label: string) =>
    z
        .number({ invalid_type_error: `Enter a valid ${label}` })
        .int(`Whole numbers only`)
        .min(min, `${label} must be at least ${min}`)
        .max(max, `${label} must be at most ${max}`)
        .optional();

const TechnicianBase = z.object({
    name: z.string().trim().min(2, "Enter the full name").max(80),
    fatherName: optionalText(80),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit mobile number"),
    workEmail: z.string().trim().toLowerCase().email("Enter a valid work email"),
    address: optionalText(300),
    age: optionalInt(18, 80, "age"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    experienceYears: optionalInt(0, 60, "experience"),
    photo: z
        .string()
        .trim()
        .max(500)
        .refine((v) => v === "" || v.startsWith("/") || /^https:\/\//.test(v), "Use a path like /photo.jpg or an https link")
        .optional()
        .transform((v) => (v ? v : undefined)),
    specializations: z.array(z.enum(APPLIANCE_CATEGORIES)),
    serviceAreaIds: z.array(z.string().min(1)),
    accountHolderName: optionalText(80),
    accountNumber: z
        .string()
        .trim()
        .regex(/^\d{6,20}$/, "Account number should be 6 to 20 digits")
        .optional()
        .or(z.literal(""))
        .transform((v) => (v ? v : undefined)),
    ifsc: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "IFSC looks wrong (example: SBIN0001234)")
        .optional()
        .or(z.literal(""))
        .transform((v) => (v ? v : undefined)),
    idType: optionalText(40),
    idNumber: optionalText(40),
    isActive: z.boolean(),
});

export const CreateTechnicianSchema = TechnicianBase.extend({ pin: PinSchema });

export const UpdateTechnicianSchema = TechnicianBase.extend({
    newPin: PinSchema.optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    unlock: z.boolean().optional(),
});

export type CreateTechnicianInput = z.infer<typeof CreateTechnicianSchema>;
export type UpdateTechnicianInput = z.infer<typeof UpdateTechnicianSchema>;

export const TechnicianLoginSchema = z.object({
    email: z.string().trim().toLowerCase().email("Enter your work email"),
    pin: z.string().regex(/^\d{6,10}$/, "Enter your PIN"),
});
