import { describe, expect, it } from "vitest";
import { BookingBatchInputSchema } from "./booking";

const shared = {
    customerName: "Test Customer",
    mobile: "9876543210",
    serviceAreaId: "area1",
    town: "Bareilly",
    pincode: "243001",
    streetAddress: "1 Test Road",
    date: "2026-12-01",
    time: "10:00 AM" as const,
};

describe("BookingBatchInputSchema", () => {
    it("accepts a cart within the per-line and total-unit caps", () => {
        const result = BookingBatchInputSchema.safeParse({ ...shared, items: [{ serviceId: "s1", qty: 5 }, { serviceId: "s2", qty: 5 }] });
        expect(result.success).toBe(true);
    });

    it("rejects a cart over the total-unit cap even if each line is within its own limit", () => {
        const result = BookingBatchInputSchema.safeParse({ ...shared, items: [{ serviceId: "s1", qty: 5 }, { serviceId: "s2", qty: 5 }, { serviceId: "s3", qty: 1 }] });
        expect(result.success).toBe(false);
    });

    it("rejects a line over its own per-service cap", () => {
        const result = BookingBatchInputSchema.safeParse({ ...shared, items: [{ serviceId: "s1", qty: 6 }] });
        expect(result.success).toBe(false);
    });

    it("rejects an empty cart", () => {
        const result = BookingBatchInputSchema.safeParse({ ...shared, items: [] });
        expect(result.success).toBe(false);
    });
});
