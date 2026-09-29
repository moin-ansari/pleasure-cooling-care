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
// shown (photo + name is enough for a glance), and tighter padding keeps the tile short.
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
              className={`flex flex-col items-center gap-1 rounded-2xl bg-blue-50 p-2 text-center ${active ? "ring-2 ring-blue-600" : ""}`}
            >
              <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
                <CategoryImage category={c} />
              </div>
              <p className="text-xs font-bold leading-tight text-blue-900 sm:text-sm">{CATEGORY_LABELS[c]}</p>
            </button>
          );
        })}

        <Link href="/track" className="flex flex-col items-center gap-1 rounded-2xl bg-blue-50 p-2 text-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center sm:h-24 sm:w-24">
            <ClipboardCheck className="h-9 w-9 text-blue-700" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold leading-tight text-blue-900 sm:text-sm">Track service</p>
        </Link>

        <a href={`tel:+91${BUSINESS.phone}`} className="flex flex-col items-center gap-1 rounded-2xl bg-blue-50 p-2 text-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center sm:h-24 sm:w-24">
            <PhoneCall className="h-9 w-9 text-blue-700" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold leading-tight text-blue-900 sm:text-sm">Free consultation call</p>
        </a>
      </div>
    </section>
  );
}
