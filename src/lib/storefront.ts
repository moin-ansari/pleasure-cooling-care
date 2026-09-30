import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { listServices } from "@/lib/domain/services";
import { listServiceAreas } from "@/lib/domain/serviceAreas";
import { getPublicReviews } from "@/lib/domain/reviews";
import { listPublicTechnicians } from "@/lib/domain/technicians";
import { slugify } from "@/lib/slug";

export const STOREFRONT_TAG = "storefront";

// Cached until an admin change calls revalidateTag(STOREFRONT_TAG).
export const getStorefrontServices = unstable_cache(() => listServices({ activeOnly: true }), ["storefront-services"], {
    tags: [STOREFRONT_TAG],
});

export const getStorefrontAreas = unstable_cache(() => listServiceAreas({ activeOnly: true }), ["storefront-areas"], {
    tags: [STOREFRONT_TAG],
});

export const getStorefrontReviews = unstable_cache(() => getPublicReviews(12), ["storefront-reviews"], { tags: [STOREFRONT_TAG] });

export const getStorefrontTechnicians = unstable_cache(() => listPublicTechnicians(12), ["storefront-technicians"], { tags: [STOREFRONT_TAG] });

export interface StorefrontStats {
    completedJobs: number;
}

// Simple counts for the "customer experience" stat row. Cheap enough to count directly rather than keep a
// running total, and cached the same as everything else on the homepage.
async function loadStorefrontStats(): Promise<StorefrontStats> {
    const completedJobs = await db.booking.count({ where: { status: "COMPLETED" } });
    return { completedJobs };
}

export const getStorefrontStats = unstable_cache(loadStorefrontStats, ["storefront-stats"], { tags: [STOREFRONT_TAG] });

export function districtSlug(district: string): string {
    return slugify(district);
}
