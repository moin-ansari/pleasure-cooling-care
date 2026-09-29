"use client";
import React from "react";
import Link from "next/link";
import { ClipboardCheck, PhoneCall } from "lucide-react";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, type ApplianceCategoryValue, type CategoryFilter } from "@/constants/appliances";
import { CategoryImage } from "@/components/custom/categoryIcons";
import { BUSINESS } from "@/constants/business";
import type { ServiceItem } from "@/types/service";

// 3 across, 2 rows — 4 real appliance categories plus 2 plain utility tiles (Track service, Free
// consultation call). Light-blue tiles with a large centered photo and a bold blue label, a visible
// "What do you need help with?" heading and a "View all" clear-filter link — same information as
// before (category name, live service count), restyled to match the reference app's tile grid.
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
    <section aria-labelledby="category-heading" className="px-2 py-5 sm:px-4">
      <div className="mx-auto flex max-w-xl items-center justify-between">
        <h2 id="category-heading" className="text-lg font-bold text-blue-950 sm:text-xl">
          What do you need help with?
        </h2>
        <button type="button" onClick={() => onChange("all")} className="flex items-center gap-1 text-sm font-medium text-blue-700">
          View all <span aria-hidden="true">&rarr;</span>
        </button>
      </div>

      <div className="mx-auto mt-3 grid max-w-xl grid-cols-3 gap-2 sm:gap-3">
        {APPLIANCE_CATEGORIES.map((c) => {
          const active = value === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(active ? "all" : c)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1.5 rounded-2xl bg-blue-50 p-3 text-center ${active ? "ring-2 ring-blue-600" : ""}`}
            >
              <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                <CategoryImage category={c} />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight text-blue-900 sm:text-sm">{CATEGORY_LABELS[c]}</p>
                <p className="text-[10px] leading-tight text-emerald-600 sm:text-xs">
                  {countOf(c)} {countOf(c) === 1 ? "service" : "services"}
                </p>
              </div>
            </button>
          );
        })}

        <Link href="/track" className="flex flex-col items-center gap-1.5 rounded-2xl bg-blue-50 p-3 text-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center sm:h-20 sm:w-20">
            <ClipboardCheck className="h-8 w-8 text-blue-700" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold leading-tight text-blue-900 sm:text-sm">Track service</p>
        </Link>

        <a href={`tel:+91${BUSINESS.phone}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-blue-50 p-3 text-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center sm:h-20 sm:w-20">
            <PhoneCall className="h-8 w-8 text-blue-700" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold leading-tight text-blue-900 sm:text-sm">Free consultation call</p>
        </a>
      </div>
    </section>
  );
}
