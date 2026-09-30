"use client";
import React from "react";
import Link from "next/link";
import { ClipboardCheck, PhoneCall } from "lucide-react";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, type CategoryFilter } from "@/constants/appliances";
import { CategoryImage } from "@/components/custom/categoryIcons";
import { BUSINESS } from "@/constants/business";
import type { ServiceItem } from "@/types/service";

// 3 across, 2 rows — 4 real appliance categories plus 2 plain utility tiles (Track service, Free
// consultation call). Light-blue tiles with a large centered photo and a bold blue label underneath,
// a visible "What do you need help with?" heading and a "View all" clear-filter link. No service count
// shown (photo + name is enough for a glance). Every tile is the same `aspect-[4/3]` box (height always
// less than width, whatever the column width ends up being) with a fixed-height, 2-line-clamped label
// area, so a longer name like "Washing Machine" never makes its tile taller than the others.
export default function CategoryGrid({
  services,
  value,
  onChange,
}: {
  services: ServiceItem[];
  value: CategoryFilter;
  onChange: (v: CategoryFilter) => void;
}) {
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
              className={`flex aspect-[4/3] flex-col items-center gap-1 rounded-2xl bg-blue-50 p-2 text-center ${active ? "ring-2 ring-blue-600" : ""}`}
            >
              <div className="relative w-full min-h-0 flex-1">
                <CategoryImage category={c} />
              </div>
              <p className="line-clamp-2 h-7 w-full shrink-0 text-xs font-bold leading-tight text-blue-900 sm:h-8 sm:text-sm">{CATEGORY_LABELS[c]}</p>
            </button>
          );
        })}

        <Link href="/track" className="flex aspect-[4/3] flex-col items-center gap-1 rounded-2xl bg-blue-50 p-2 text-center">
          <div className="flex w-full min-h-0 flex-1 items-center justify-center">
            <ClipboardCheck className="h-6 w-6 text-slate-500 sm:h-7 sm:w-7" aria-hidden="true" />
          </div>
          <p className="line-clamp-2 h-7 w-full shrink-0 text-xs font-bold leading-tight text-blue-900 sm:h-8 sm:text-sm">Track service</p>
        </Link>

        <a href={`tel:+91${BUSINESS.phone}`} className="flex aspect-[4/3] flex-col items-center gap-1 rounded-2xl bg-blue-50 p-2 text-center">
          <div className="flex w-full min-h-0 flex-1 items-center justify-center">
            <PhoneCall className="h-6 w-6 text-slate-500 sm:h-7 sm:w-7" aria-hidden="true" />
          </div>
          <p className="line-clamp-2 h-7 w-full shrink-0 text-xs font-bold leading-tight text-blue-900 sm:h-8 sm:text-sm">Free consultation call</p>
        </a>
      </div>
    </section>
  );
}
