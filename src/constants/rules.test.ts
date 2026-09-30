import { describe, expect, it } from "vitest";
import { ACTIVE_STATUS_ORDER, TECHNICIAN_TRANSITIONS, isCancellableByCustomer } from "./booking";
import { SMS_TEMPLATES, renderSms, type SmsTemplateKey } from "./sms";
import { normalizeIndianMobile, isValidIndianMobile } from "@/lib/phone";
import { addDaysToDateString, istDateString, slotToHHmm, slotToMinutes } from "@/lib/time";

describe("booking status rules", () => {
    it("a technician can never cancel and finished jobs are final", () => {
        for (const next of Object.values(TECHNICIAN_TRANSITIONS)) expect(next).not.toContain("CANCELLED");
        expect(TECHNICIAN_TRANSITIONS.COMPLETED).toEqual([]);
        expect(TECHNICIAN_TRANSITIONS.CANCELLED).toEqual([]);
    });

    it("a job cannot be started before the technician is on the way", () => {
        expect(TECHNICIAN_TRANSITIONS.CONFIRMED).toEqual(["ARRIVING"]);
    });

    it("customers can cancel only before the cutoff status", () => {
        expect(isCancellableByCustomer("NEW", "ARRIVING")).toBe(true);
        expect(isCancellableByCustomer("CONFIRMED", "ARRIVING")).toBe(true);
        expect(isCancellableByCustomer("ARRIVING", "ARRIVING")).toBe(false);
        expect(isCancellableByCustomer("WORKING", "ARRIVING")).toBe(false);
        expect(isCancellableByCustomer("COMPLETED", "ARRIVING")).toBe(false);
        expect(isCancellableByCustomer("CANCELLED", "ARRIVING")).toBe(false);
    });

    it("lists every active status once", () => {
        expect(new Set(ACTIVE_STATUS_ORDER).size).toBe(ACTIVE_STATUS_ORDER.length);
    });
});

describe("sms templates", () => {
    it("every template has exactly one placeholder per variable", () => {
        for (const key of Object.keys(SMS_TEMPLATES) as SmsTemplateKey[]) {
            const placeholders = SMS_TEMPLATES[key].text.match(/\{#var#\}/g)?.length ?? 0;
            expect(placeholders, key).toBe(SMS_TEMPLATES[key].vars.length);
        }
    });

    it("fills the values in order", () => {
        expect(renderSms("TECHNICIAN_REMOVED", ["PCC-ABC123", "https://x.test"])).toBe(
            "Booking PCC-ABC123 is no longer assigned to you. Please check your job list: https://x.test"
        );
    });
});

describe("phone numbers", () => {
    it("accepts the ways people type them", () => {
        for (const v of ["9876543210", "98765 43210", "+91 98765-43210", "09876543210", "919876543210"]) {
            expect(normalizeIndianMobile(v), v).toBe("9876543210");
        }
    });

    it("rejects numbers that cannot be mobiles", () => {
        expect(isValidIndianMobile("5876543210")).toBe(false);
        expect(isValidIndianMobile("12345")).toBe(false);
        expect(isValidIndianMobile("")).toBe(false);
    });
});

describe("india time", () => {
    it("reads the date in India, not UTC", () => {
        expect(istDateString(new Date("2026-09-25T20:00:00Z"))).toBe("2026-09-26");
        expect(istDateString(new Date("2026-09-25T18:29:00Z"))).toBe("2026-09-25");
    });

    it("adds days across month ends", () => {
        expect(addDaysToDateString("2026-09-30", 1)).toBe("2026-10-01");
        expect(addDaysToDateString("2026-03-01", -1)).toBe("2026-02-28");
    });

    it("converts time slots", () => {
        expect(slotToMinutes("02:00 PM")).toBe(840);
        expect(slotToMinutes("12:00 PM")).toBe(720);
        expect(slotToMinutes("12:00 AM")).toBe(0);
        expect(slotToHHmm("06:00 PM")).toBe("18:00");
        expect(slotToMinutes("bogus")).toBe(-1);
    });
});
