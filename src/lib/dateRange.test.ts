import { describe, expect, it } from "vitest";
import { currentMonth, monthRange, resolveRange, shiftMonth } from "./dateRange";

// 10:00 on 15 Sept 2026 in India.
const NOW = new Date("2026-09-15T04:30:00Z");
const iso = (d: Date | null) => d?.toISOString() ?? null;

describe("resolveRange (India time, start included, end excluded)", () => {
    it("today", () => {
        const r = resolveRange("today", undefined, undefined, NOW);
        expect(iso(r.start)).toBe("2026-09-14T18:30:00.000Z");
        expect(iso(r.end)).toBe("2026-09-15T18:30:00.000Z");
    });

    it("this month runs from the 1st to the 1st of next month", () => {
        const r = resolveRange("this_month", undefined, undefined, NOW);
        expect(iso(r.start)).toBe("2026-08-31T18:30:00.000Z");
        expect(iso(r.end)).toBe("2026-09-30T18:30:00.000Z");
    });

    it("last month, including across a year boundary", () => {
        const sept = resolveRange("last_month", undefined, undefined, NOW);
        expect(iso(sept.start)).toBe("2026-07-31T18:30:00.000Z");
        expect(iso(sept.end)).toBe("2026-08-31T18:30:00.000Z");
        const jan = resolveRange("last_month", undefined, undefined, new Date("2027-01-10T06:00:00Z"));
        expect(iso(jan.start)).toBe("2026-11-30T18:30:00.000Z");
        expect(iso(jan.end)).toBe("2026-12-31T18:30:00.000Z");
    });

    it("counts the day in India even when UTC is still the day before", () => {
        // 00:30 on 1 Oct in India is 19:00 on 30 Sept in UTC
        const r = resolveRange("this_month", undefined, undefined, new Date("2026-09-30T19:00:00Z"));
        expect(iso(r.start)).toBe("2026-09-30T18:30:00.000Z");
    });

    it("all time has no bounds", () => {
        expect(resolveRange("all", undefined, undefined, NOW)).toEqual({ start: null, end: null });
    });

    it("custom includes the last day chosen and rejects bad input", () => {
        const r = resolveRange("custom", "2026-09-01", "2026-09-03", NOW);
        expect(iso(r.start)).toBe("2026-08-31T18:30:00.000Z");
        expect(iso(r.end)).toBe("2026-09-03T18:30:00.000Z");
        expect(resolveRange("custom", "2026-09-05", "2026-09-01", NOW)).toEqual({ start: null, end: null });
        expect(resolveRange("custom", "nope", "2026-09-01", NOW)).toEqual({ start: null, end: null });
    });
});

describe("months", () => {
    it("monthRange covers one calendar month and rejects bad input", () => {
        expect(iso(monthRange("2026-12")!.end)).toBe("2026-12-31T18:30:00.000Z");
        expect(monthRange("2026-13")).toBeNull();
        expect(monthRange("September")).toBeNull();
    });

    it("shiftMonth moves across years", () => {
        expect(shiftMonth("2026-01", -1)).toBe("2025-12");
        expect(shiftMonth("2026-12", 1)).toBe("2027-01");
        expect(shiftMonth("2026-09", 0)).toBe("2026-09");
    });

    it("currentMonth follows India time", () => {
        expect(currentMonth(new Date("2026-09-30T19:00:00Z"))).toBe("2026-10");
    });
});
