import { describe, expect, it } from "vitest";
import { computeCommission, round2 } from "./money";

describe("computeCommission", () => {
    it("takes the percentage of the service charge", () => {
        expect(computeCommission(299, { ratePercent: 15, flatAmount: 0 })).toBe(44.85);
        expect(computeCommission(1000, { ratePercent: 15, flatAmount: 0 })).toBe(150);
    });

    it("adds the flat amount on top", () => {
        expect(computeCommission(1000, { ratePercent: 15, flatAmount: 50 })).toBe(200);
        expect(computeCommission(0, { ratePercent: 0, flatAmount: 25 })).toBe(25);
    });

    it("is zero when there is nothing to charge", () => {
        expect(computeCommission(0, { ratePercent: 15, flatAmount: 0 })).toBe(0);
        expect(computeCommission(500, { ratePercent: 0, flatAmount: 0 })).toBe(0);
    });

    it("does not drift on amounts that break floating point", () => {
        expect(computeCommission(333, { ratePercent: 15, flatAmount: 0 })).toBe(49.95);
        expect(computeCommission(1, { ratePercent: 15, flatAmount: 0 })).toBe(0.15);
        expect(computeCommission(7, { ratePercent: 12.5, flatAmount: 0 })).toBe(0.88);
    });

    it("never goes negative", () => {
        expect(computeCommission(100, { ratePercent: -10, flatAmount: 0 })).toBe(0);
    });
});

describe("round2", () => {
    it("rounds to whole paise", () => {
        expect(round2(44.849999999)).toBe(44.85);
        expect(round2(0.1 + 0.2)).toBe(0.3);
    });
});

import { splitCommission } from "./money";

describe("splitCommission", () => {
    const store = { ratePercent: 20, ownerRatePercent: 10, flatAmount: 0 };

    it("gives the owner 10 points of the 20% and lets the store keep the rest", () => {
        expect(splitCommission(1000, store)).toEqual({ technicianOwes: 200, ownerShare: 100, storeKeeps: 100 });
    });

    it("sends the flat amount to the owner only", () => {
        expect(splitCommission(1000, { ...store, flatAmount: 50 })).toEqual({ technicianOwes: 250, ownerShare: 150, storeKeeps: 100 });
    });

    it("gives the owner everything in the main store", () => {
        expect(splitCommission(1000, { ratePercent: 20, ownerRatePercent: 20, flatAmount: 0 })).toEqual({ technicianOwes: 200, ownerShare: 200, storeKeeps: 0 });
    });

    it("stays exact on awkward amounts", () => {
        const r = splitCommission(299, store);
        expect(r).toEqual({ technicianOwes: 59.8, ownerShare: 29.9, storeKeeps: 29.9 });
        expect(r.ownerShare + r.storeKeeps).toBeCloseTo(r.technicianOwes, 10);
    });

    it("charges only the flat amount on a free job, and nothing when there is none", () => {
        expect(splitCommission(0, { ...store, flatAmount: 30 })).toEqual({ technicianOwes: 30, ownerShare: 30, storeKeeps: 0 });
        expect(splitCommission(0, store)).toEqual({ technicianOwes: 0, ownerShare: 0, storeKeeps: 0 });
    });

    it("never gives the owner more than the technician pays", () => {
        const r = splitCommission(1000, { ratePercent: 5, ownerRatePercent: 10, flatAmount: 0 });
        expect(r.ownerShare).toBeLessThanOrEqual(r.technicianOwes);
        expect(r.storeKeeps).toBe(0);
    });
});
