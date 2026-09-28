"use client";
import React, { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import CategoryGrid from "@/components/custom/CategoryGrid";
import ServiceCard from "@/components/custom/serviceCard";
import { CATEGORY_LABELS, type CategoryFilter } from "@/constants/appliances";
import type { ServiceItem } from "@/types/service";

// Search box + category grid + the services list, all sharing one filter so tapping a category or typing
// a search term narrows the same grid — a small dataset (tens of rows), so this is a plain client-side
// filter over the services already fetched server-side, no new API.
export default function ServicesBrowser({ services }: { services: ServiceItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      if (category !== "all" && s.applianceCategory !== category) return false;
      if (!q) return true;
      return (
        s.serviceType.toLowerCase().includes(q) ||
        s.applianceSubType.toLowerCase().includes(q) ||
        CATEGORY_LABELS[s.applianceCategory].toLowerCase().includes(q)
      );
    });
  }, [services, query, category]);

  return (
    <div>
      <div className="px-3 sm:px-6">
        <div className="relative mx-auto max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <label htmlFor="storefront-search" className="sr-only">
            Search for a service
          </label>
          <Input
            id="storefront-search"
            className="h-12 rounded-full bg-white pl-9 pr-9 text-base shadow-sm"
            placeholder="Search “AC repair”, “fridge”, “geyser install”..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <CategoryGrid services={services} value={category} onChange={setCategory} />

      <section id="services" aria-labelledby="services-heading" className="px-3 py-6 sm:px-6">
        <h2 id="services-heading" className="mb-8 text-center text-3xl font-bold text-primary">
          {query || category !== "all" ? `${filtered.length} matching ${filtered.length === 1 ? "service" : "services"}` : "Services"}
        </h2>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            No services match{query ? ` “${query}”` : ""}. Try another search or{" "}
            <button type="button" className="text-blue-700 underline" onClick={() => { setQuery(""); setCategory("all"); }}>
              clear filters
            </button>
            .
          </p>
        ) : (
          <ServiceCard services={filtered} />
        )}
      </section>
    </div>
  );
}
