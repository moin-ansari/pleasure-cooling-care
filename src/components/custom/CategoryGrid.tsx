"use client";
import React from "react";
import Link from "next/link";
import { ClipboardCheck, PhoneCall } from "lucide-react";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, type ApplianceCategoryValue, type CategoryFilter } from "@/constants/appliances";
import { CategoryImage } from "@/components/custom/categoryIcons";
import { BUSINESS } from "@/constants/business";
import type { ServiceItem } from "@/types/service";

// 3 across, 2 rows — 4 real appliance categories plus 2 plain utility tiles (Track service, Free
// consultation call), matching Urban Company's own category-tile grid.
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
      <h2 id="category-heading" className="sr-only">
        What do you need serviced?
      </h2>
      <div className="mx-auto grid max-w-xl grid-cols-3 gap-2">
        {APPLIANCE_CATEGORIES.map((c) => {
          const active = value === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(active ? "all" : c)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1.5 rounded-xl border bg-white p-2 text-center shadow-sm ${active ? "border-blue-700 ring-2 ring-blue-200" : "border-slate-100"}`}
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-16 sm:w-16">
                <CategoryImage category={c} />
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight text-slate-900 sm:text-sm">{CATEGORY_LABELS[c]}</p>
                <p className="text-[10px] leading-tight text-emerald-600 sm:text-xs">
                  {countOf(c)} {countOf(c) === 1 ? "service" : "services"}
                </p>
              </div>
            </button>
          );
        })}

        <Link href="/track" className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-white p-2 text-center shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 sm:h-16 sm:w-16">
            <ClipboardCheck className="h-6 w-6 text-blue-700" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold leading-tight text-slate-900 sm:text-sm">Track service</p>
        </Link>

        <a href={`tel:+91${BUSINESS.phone}`} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-white p-2 text-center shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 sm:h-16 sm:w-16">
            <PhoneCall className="h-6 w-6 text-blue-700" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold leading-tight text-slate-900 sm:text-sm">Free consultation call</p>
        </a>
      </div>
    </section>
  );
}
