export type RankValue = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

export interface Tier {
    minJobs: number;
    minRating: number;
}

export type RankThresholds = Record<Exclude<RankValue, "BRONZE">, Tier>;

export const DEFAULT_THRESHOLDS: RankThresholds = {
    SILVER: { minJobs: 25, minRating: 4.0 },
    GOLD: { minJobs: 75, minRating: 4.4 },
    DIAMOND: { minJobs: 150, minRating: 4.7 },
};

const ORDER: Exclude<RankValue, "BRONZE">[] = ["DIAMOND", "GOLD", "SILVER"];
const UP: Record<RankValue, Exclude<RankValue, "BRONZE"> | null> = { BRONZE: "SILVER", SILVER: "GOLD", GOLD: "DIAMOND", DIAMOND: null };

// The highest tier the technician qualifies for on both jobs done and average rating.
// With no ratings yet the average is 0, so they stay Bronze.
export function rankFor(jobs: number, averageRating: number, thresholds: RankThresholds = DEFAULT_THRESHOLDS): RankValue {
    for (const tier of ORDER) {
        const t = thresholds[tier];
        if (jobs >= t.minJobs && averageRating >= t.minRating) return tier;
    }
    return "BRONZE";
}

export interface NextRank {
    rank: Exclude<RankValue, "BRONZE">;
    jobsNeeded: number;
    ratingNeeded: number | null;
}

// What is still missing for the next tier. ratingNeeded is null when the rating already qualifies.
export function nextRankProgress(current: RankValue, jobs: number, averageRating: number, thresholds: RankThresholds = DEFAULT_THRESHOLDS): NextRank | null {
    const next = UP[current];
    if (!next) return null;
    const t = thresholds[next];
    return {
        rank: next,
        jobsNeeded: Math.max(0, t.minJobs - jobs),
        ratingNeeded: averageRating >= t.minRating ? null : t.minRating,
    };
}
