import { z } from "zod";
import { TIME_SLOTS } from "@/constants/booking";

export const BookingInputSchema = z.object({
    customerName: z.string().trim().min(2, "Enter your name").max(80),
    mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit mobile number"),
    serviceId: z.string().min(1, "Choose a service"),
    serviceAreaId: z.string().min(1, "Choose your district"),
    town: z.string().trim().min(2, "Enter your town or village").max(80),
    pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter a valid 6 digit pincode"),
    streetAddress: z.string().trim().min(5, "Enter your street or landmark").max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    time: z.enum(TIME_SLOTS, { errorMap: () => ({ message: "Choose a time" }) }),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    utmSource: z.string().max(100).optional(),
    utmMedium: z.string().max(100).optional(),
    utmCampaign: z.string().max(100).optional(),
    clickId: z.string().max(200).optional(),
    idempotencyKey: z.string().min(8).max(100).optional(),
});

export type BookingInput = z.infer<typeof BookingInputSchema>;

export const TrackInputSchema = z.object({
    mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit mobile number"),
});

export const CancelInputSchema = z.object({
    bookingRef: z.string().trim().min(6).max(20),
    mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit mobile number"),
    reason: z.string().trim().max(200).optional(),
});
