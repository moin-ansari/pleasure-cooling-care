import { z } from "zod";

const tier = (name: string) =>
    z.object({
        minJobs: z.number({ invalid_type_error: `Enter the jobs needed for ${name}` }).int("Whole numbers only").min(1).max(100000),
        minRating: z.number({ invalid_type_error: `Enter the rating needed for ${name}` }).min(1).max(5),
    });

export const RankSettingsSchema = z
    .object({ silver: tier("Silver"), gold: tier("Gold"), diamond: tier("Diamond") })
    .refine((v) => v.silver.minJobs < v.gold.minJobs && v.gold.minJobs < v.diamond.minJobs, "Each rank must need more jobs than the one below it")
    .refine((v) => v.silver.minRating <= v.gold.minRating && v.gold.minRating <= v.diamond.minRating, "Each rank must need at least the rating of the one below it");

export const CancelCutoffSchema = z.object({ cancelBlockedFrom: z.enum(["CONFIRMED", "ARRIVING", "WORKING"]) });
