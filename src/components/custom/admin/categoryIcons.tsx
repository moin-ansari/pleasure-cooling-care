import { Flame, Refrigerator, Snowflake, WashingMachine, type LucideIcon } from "lucide-react";
import type { ApplianceCategoryValue } from "@/constants/appliances";

// One glance-able icon per appliance, so a list of jobs reads as AC/fridge/washer/geyser without
// having to read the category text on every row. Kept out of src/constants (framework-free) since
// this pulls in React components.
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

export function CategoryIcon({ category, className = "h-3.5 w-3.5" }: { category: ApplianceCategoryValue; className?: string }) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon className={className} aria-hidden="true" />;
}
