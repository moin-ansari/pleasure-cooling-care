import { unstable_cache } from "next/cache";
import { listServices } from "@/lib/domain/services";
import { listServiceAreas } from "@/lib/domain/serviceAreas";
import { slugify } from "@/lib/slug";

export const STOREFRONT_TAG = "storefront";

// Cached until an admin change calls revalidateTag(STOREFRONT_TAG).
export const getStorefrontServices = unstable_cache(() => listServices({ activeOnly: true }), ["storefront-services"], {
    tags: [STOREFRONT_TAG],
});

export const getStorefrontAreas = unstable_cache(() => listServiceAreas({ activeOnly: true }), ["storefront-areas"], {
    tags: [STOREFRONT_TAG],
});

export function districtSlug(district: string): string {
    return slugify(district);
}
