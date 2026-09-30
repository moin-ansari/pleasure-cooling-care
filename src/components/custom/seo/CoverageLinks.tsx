import Link from "next/link";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, CATEGORY_SLUGS, type ApplianceCategoryValue } from "@/constants/appliances";
import type { ServiceAreaItem } from "@/lib/domain/serviceAreas";
import { districtSlug } from "@/lib/storefront";
import type { ServiceItem } from "@/types/service";

// Internal links to every district and appliance page that has services. Plain links, so crawlers can follow them.
export default function CoverageLinks({
  areas,
  services,
  heading = "Areas we serve",
  excludeAreaId,
}: {
  areas: ServiceAreaItem[];
  services: ServiceItem[];
  heading?: string;
  excludeAreaId?: string;
}) {
  const categories = APPLIANCE_CATEGORIES.filter((c) => services.some((s) => s.applianceCategory === c));
  const shown = excludeAreaId ? areas.filter((a) => a.id !== excludeAreaId) : areas;
  if (shown.length === 0 || categories.length === 0) return null;

  return (
    <section aria-labelledby="coverage-heading" className="py-6 px-3 sm:w-1/2 sm:m-auto">
      <h2 id="coverage-heading" className="text-2xl font-bold text-gray-800 text-center mb-6">
        {heading}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {shown.map((area) => (
          <div key={area.id} className="rounded-md border p-4">
            <h3 className="font-semibold mb-2">
              <Link href={`/${districtSlug(area.district)}`} className="hover:underline">
                {area.district}
              </Link>
            </h3>
            <ul className="text-sm text-muted-foreground flex flex-col gap-1">
              {categories.map((c: ApplianceCategoryValue) => (
                <li key={c}>
                  <Link href={`/${districtSlug(area.district)}/${CATEGORY_SLUGS[c]}`} className="hover:underline">
                    {CATEGORY_LABELS[c]} repair in {area.district}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
