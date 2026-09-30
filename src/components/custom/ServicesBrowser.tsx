"use client";
import React, { useMemo, useState } from "react";
import CategoryGrid from "@/components/custom/CategoryGrid";
import ServiceCard from "@/components/custom/serviceCard";
import type { CategoryFilter } from "@/constants/appliances";
import type { ServiceItem } from "@/types/service";

// Category grid + the services list, sharing one filter so tapping a category narrows the grid below.
// Search is hidden for now (easy to bring back — this only removed the input, the data flow is unchanged).
export default function ServicesBrowser({ services, reviewCount }: { services: ServiceItem[]; reviewCount: number }) {
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = useMemo(() => {
    if (category === "all") return services;
    return services.filter((s) => s.applianceCategory === category);
  }, [services, category]);

  return (
    <div>
      <CategoryGrid services={services} value={category} onChange={setCategory} />

      <section id="services" aria-labelledby="services-heading" className="px-2 py-3 sm:px-4">
        <h2 id="services-heading" className="mb-3 text-lg font-bold text-primary sm:text-xl">
          {category !== "all" ? `${filtered.length} matching ${filtered.length === 1 ? "service" : "services"}` : "Services"}
        </h2>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            No services here yet.{" "}
            <button type="button" className="text-blue-700 underline" onClick={() => setCategory("all")}>
              Clear filter
            </button>
            .
          </p>
        ) : (
          <ServiceCard services={filtered} reviewCount={reviewCount} />
        )}
      </section>
    </div>
  );
}
