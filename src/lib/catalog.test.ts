import { describe, expect, it } from "vitest";
import { bulkPrice, BulkServiceSchema, ServiceCreateSchema, ServicePatchSchema } from "@/schema/service";
import { sniffImageType } from "@/lib/storage";

describe("bulkPrice", () => {
    it("sets one price", () => expect(bulkPrice(299, "setPrice", 350)).toBe(350));
    it("raises and lowers by a percentage, in whole rupees", () => {
        expect(bulkPrice(299, "changePercent", 10)).toBe(329);
        expect(bulkPrice(299, "changePercent", -10)).toBe(269);
    });
    it("adds or subtracts rupees", () => {
        expect(bulkPrice(299, "changeAmount", 50)).toBe(349);
        expect(bulkPrice(299, "changeAmount", -50)).toBe(249);
    });
    it("never goes below zero or above the limit", () => {
        expect(bulkPrice(40, "changeAmount", -100)).toBe(0);
        expect(bulkPrice(900000, "changePercent", 300)).toBe(1000000);
    });
});

describe("catalog schemas", () => {
    const base = { applianceCategory: "AC", applianceSubTypes: ["Split", "Window"], serviceType: "AC Repair", price: 299, warrantyDurationDays: 10, image: "", desc: ["Free visit"], isActive: true };
    it("accepts a service for several types", () => expect(ServiceCreateSchema.safeParse(base).success).toBe(true));
    it("rejects a type that does not belong to the appliance", () => expect(ServiceCreateSchema.safeParse({ ...base, applianceSubTypes: ["Top Load"] }).success).toBe(false));
    it("needs at least one type", () => expect(ServiceCreateSchema.safeParse({ ...base, applianceSubTypes: [] }).success).toBe(false));
    it("rejects fractional and negative prices", () => {
        expect(ServiceCreateSchema.safeParse({ ...base, price: 299.5 }).success).toBe(false);
        expect(ServiceCreateSchema.safeParse({ ...base, price: -1 }).success).toBe(false);
    });
    it("quick edit needs something to change", () => {
        expect(ServicePatchSchema.safeParse({}).success).toBe(false);
        expect(ServicePatchSchema.safeParse({ isActive: false }).success).toBe(true);
    });
    it("bulk actions validate their value", () => {
        expect(BulkServiceSchema.safeParse({ action: "hide", ids: ["a"] }).success).toBe(true);
        expect(BulkServiceSchema.safeParse({ action: "changePercent", ids: ["a"], value: 1000 }).success).toBe(false);
        expect(BulkServiceSchema.safeParse({ action: "setPrice", ids: [], value: 100 }).success).toBe(false);
    });
});

describe("sniffImageType", () => {
    it("recognises the real type from the first bytes", () => {
        expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe("image/jpeg");
        expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe("image/png");
        expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0]))).toBe("image/webp");
    });
    it("refuses anything else, whatever its name says", () => {
        expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
        expect(sniffImageType(new TextEncoder().encode("MZ executable"))).toBeNull();
    });
});
