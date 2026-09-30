import { describe, expect, it } from "vitest";
import { nextRankProgress, rankFor } from "./rank";

describe("rankFor", () => {
    it("starts at Bronze, and stays there with no ratings", () => {
        expect(rankFor(0, 0)).toBe("BRONZE");
        expect(rankFor(500, 0)).toBe("BRONZE");
    });
    it("needs both jobs and rating", () => {
        expect(rankFor(25, 4.0)).toBe("SILVER");
        expect(rankFor(24, 5)).toBe("BRONZE");
        expect(rankFor(25, 3.9)).toBe("BRONZE");
        expect(rankFor(75, 4.4)).toBe("GOLD");
        expect(rankFor(150, 4.7)).toBe("DIAMOND");
    });
    it("drops to the highest tier still met", () => {
        expect(rankFor(150, 4.5)).toBe("GOLD");
        expect(rankFor(150, 4.1)).toBe("SILVER");
    });
    it("honours custom thresholds", () => {
        expect(rankFor(3, 4, { SILVER: { minJobs: 3, minRating: 4 }, GOLD: { minJobs: 9, minRating: 5 }, DIAMOND: { minJobs: 99, minRating: 5 } })).toBe("SILVER");
    });
});

describe("nextRankProgress", () => {
    it("reports what is missing", () => {
        expect(nextRankProgress("BRONZE", 10, 4.5)).toEqual({ rank: "SILVER", jobsNeeded: 15, ratingNeeded: null });
        expect(nextRankProgress("BRONZE", 30, 3.5)).toEqual({ rank: "SILVER", jobsNeeded: 0, ratingNeeded: 4.0 });
    });
    it("has nothing after Diamond", () => {
        expect(nextRankProgress("DIAMOND", 200, 5)).toBeNull();
    });
});
