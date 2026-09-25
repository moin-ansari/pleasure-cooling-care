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
