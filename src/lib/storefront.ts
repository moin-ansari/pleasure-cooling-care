import { unstable_cache } from "next/cache";
import { listServices } from "@/lib/domain/services";

export const STOREFRONT_TAG = "storefront";

// Cached until an admin change calls revalidateTag(STOREFRONT_TAG).
export const getStorefrontServices = unstable_cache(() => listServices({ activeOnly: true }), ["storefront-services"], {
    tags: [STOREFRONT_TAG],
});
