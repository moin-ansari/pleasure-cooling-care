"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Flame, Refrigerator, Snowflake, WashingMachine, type LucideIcon } from "lucide-react";
import { CATEGORY_IMAGES } from "@/constants/images";
import type { ApplianceCategoryValue } from "@/constants/appliances";

// One glance-able icon per appliance, so a list of jobs reads as AC/fridge/washer/geyser without
// having to read the category text on every row. Kept out of src/constants (framework-free) since
// this pulls in React components. Shared by the admin and technician portals.
export const CATEGORY_ICONS: Record<ApplianceCategoryValue, LucideIcon> = {
  AC: Snowflake,
  REFRIGERATOR: Refrigerator,
  WASHING_MACHINE: WashingMachine,
  GEYSER: Flame,
};

export const CATEGORY_TONE: Record<ApplianceCategoryValue, string> = {
  AC: "bg-sky-100 text-sky-700",
  REFRIGERATOR: "bg-cyan-100 text-cyan-700",
  WASHING_MACHINE: "bg-indigo-100 text-indigo-700",
  GEYSER: "bg-orange-100 text-orange-700",
};

// Short enough to fit on a tab; "Air Conditioner" does not.
export const CATEGORY_TAB_LABELS: Record<ApplianceCategoryValue, string> = {
  AC: "AC",
  REFRIGERATOR: "Fridge",
  WASHING_MACHINE: "Washer",
  GEYSER: "Geyser",
};

export function CategoryIcon({ category, className = "h-3.5 w-3.5" }: { category: ApplianceCategoryValue; className?: string }) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon className={className} aria-hidden="true" />;
}

export function CategoryBadge({ category, size = "h-6 w-6", iconSize = "h-3.5 w-3.5" }: { category: ApplianceCategoryValue; size?: string; iconSize?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-md ${size} ${CATEGORY_TONE[category]}`}>
      <CategoryIcon category={category} className={iconSize} />
    </span>
  );
}

// A real appliance photo once the owner supplies one at CATEGORY_IMAGES[category]; until then (or if it
// 404s) this falls back to the tinted icon tile, never a broken-image glyph.
export function CategoryImage({ category, className = "" }: { category: ApplianceCategoryValue; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`flex items-center justify-center ${CATEGORY_TONE[category]} ${className}`}>
        <CategoryIcon category={category} className="h-8 w-8" />
      </div>
    );
  }
  return (
    <Image
      src={CATEGORY_IMAGES[category]}
      alt=""
      fill
      sizes="(max-width: 640px) 25vw, 200px"
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
