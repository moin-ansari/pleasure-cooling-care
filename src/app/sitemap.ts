import type { MetadataRoute } from "next";
import { APPLIANCE_CATEGORIES, CATEGORY_SLUGS } from "@/constants/appliances";
import { absoluteUrl } from "@/lib/site";
import { districtSlug, getStorefrontAreas, getStorefrontServices } from "@/lib/storefront";

// Rendered per request from the cached storefront data, so admin changes show up straight away.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [areas, services] = await Promise.all([getStorefrontAreas(), getStorefrontServices()]);
  const categories = APPLIANCE_CATEGORIES.filter((c) => services.some((s) => s.applianceCategory === c));

  return [
    { url: absoluteUrl("/home"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/guarantee-terms"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    ...areas.map((a) => ({ url: absoluteUrl(`/${districtSlug(a.district)}`), changeFrequency: "weekly" as const, priority: 0.9 })),
    ...areas.flatMap((a) =>
      categories.map((c) => ({
        url: absoluteUrl(`/${districtSlug(a.district)}/${CATEGORY_SLUGS[c]}`),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }))
    ),
  ];
}
