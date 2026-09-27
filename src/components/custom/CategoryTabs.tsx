"use client";
import React from "react";
import { LayoutGrid } from "lucide-react";
import { CATEGORY_ICONS, CATEGORY_TAB_LABELS, CATEGORY_TONE } from "@/components/custom/categoryIcons";
import { APPLIANCE_CATEGORIES, type ApplianceCategoryValue, type CategoryFilter } from "@/constants/appliances";

// A horizontally-scrolling strip of appliance tabs (All/AC/Fridge/Washer/Geyser), each showing an icon and
// a live count. Shared by the admin Bookings list and the technician's job list so both read the same way.
export default function CategoryTabs({
  value,
  counts,
  onChange,
}: {
  value: CategoryFilter;
  counts?: Record<ApplianceCategoryValue, number>;
  onChange: (v: CategoryFilter) => void;
}) {
  const total = counts ? APPLIANCE_CATEGORIES.reduce((n, c) => n + counts[c], 0) : undefined;
  const tabs: { key: CategoryFilter; label: string; count?: number; Icon: React.ElementType; tone: string }[] = [
    { key: "all", label: "All", count: total, Icon: LayoutGrid, tone: "bg-slate-100 text-slate-700" },
    ...APPLIANCE_CATEGORIES.map((c) => ({ key: c, label: CATEGORY_TAB_LABELS[c], count: counts?.[c], Icon: CATEGORY_ICONS[c], tone: CATEGORY_TONE[c] })),
  ];
  return (
    <div role="tablist" aria-label="Appliance" className="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`flex min-w-[68px] shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 text-center ${active ? "border-blue-700 bg-blue-50" : "border-slate-200 bg-white"}`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${t.tone}`}>
              <t.Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className={`text-base font-bold leading-none ${active ? "text-blue-800" : "text-slate-900"}`}>{t.count ?? "-"}</span>
            <span className={`text-[11px] leading-none ${active ? "text-blue-700" : "text-slate-500"}`}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
