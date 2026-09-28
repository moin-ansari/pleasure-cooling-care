"use client";
import React from "react";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, type ApplianceCategoryValue, type CategoryFilter } from "@/constants/appliances";
import { CategoryIcon, CategoryImage } from "@/components/custom/categoryIcons";
import type { ServiceItem } from "@/types/service";

// The 4 appliances we service, shown directly — no subcategories. Tapping one filters the services
// grid below via the shared category/search state in ServicesBrowser.
export default function CategoryGrid({
  services,
  value,
  onChange,
}: {
  services: ServiceItem[];
  value: CategoryFilter;
  onChange: (v: CategoryFilter) => void;
}) {
  const countOf = (c: ApplianceCategoryValue) => services.filter((s) => s.applianceCategory === c).length;

  return (
    <section aria-labelledby="category-heading" className="px-3 py-6 sm:px-6">
      <h2 id="category-heading" className="mb-4 text-center text-2xl font-bold text-slate-900">
        What do you need serviced?
      </h2>
      <div className="mx-auto grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
        {APPLIANCE_CATEGORIES.map((c) => {
          const active = value === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(active ? "all" : c)}
              aria-pressed={active}
              className={`overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition ${active ? "border-blue-700 ring-2 ring-blue-200" : "border-slate-200"}`}
            >
              <div className="relative h-24 w-full bg-slate-100 sm:h-28">
                <CategoryImage category={c} />
                <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow">
                  <CategoryIcon category={c} className="h-3.5 w-3.5 text-blue-800" />
                </span>
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-semibold text-slate-900">{CATEGORY_LABELS[c]}</p>
                <p className="text-xs text-muted-foreground">
                  {countOf(c)} {countOf(c) === 1 ? "service" : "services"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
