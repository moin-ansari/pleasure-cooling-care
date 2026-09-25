import { z } from "zod";

const money = (label: string) =>
    z.number({ invalid_type_error: `Enter ${label}` }).finite().multipleOf(0.01, "At most 2 decimal places");

export const CommissionSettingsSchema = z.object({
    commissionRatePercent: money("the commission rate").min(0, "Cannot be negative").max(100, "Cannot be more than 100"),
    commissionFlatAmount: money("the flat amount").min(0, "Cannot be negative").max(100000),
});

export const ExpenseInputSchema = z.object({
    category: z.string().trim().min(2, "Enter a category").max(60),
    amount: money("the amount").gt(0, "Enter an amount above zero").max(10000000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    note: z.string().trim().max(200).optional(),
    type: z.enum(["EXPENSE", "AD_SPEND"]),
    technicianId: z.string().optional(),
    bookingRef: z.string().trim().max(20).optional(),
});

export const SettlementInputSchema = z.object({
    kind: z.enum(["OFFICE_PAYMENT", "PAYOUT", "ADJUSTMENT"]),
    // Payments are entered as a positive number. An adjustment may be positive (technician owes more) or negative.
    amount: money("the amount").refine((v) => v !== 0, "Amount cannot be zero"),
    note: z.string().trim().max(200).optional(),
});

export const AmountsCorrectionSchema = z.object({
    laborAmount: z.number({ invalid_type_error: "Enter the service charge" }).int("Whole rupees only").min(0).max(1000000),
    partsAmount: z.number({ invalid_type_error: "Enter the parts amount" }).int("Whole rupees only").min(0).max(1000000),
    amountCollected: z.number({ invalid_type_error: "Enter the cash collected" }).int("Whole rupees only").min(0).max(1000000),
    note: z.string().trim().min(3, "Tell us why the amounts are being corrected").max(200),
});
