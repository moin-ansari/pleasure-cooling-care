import type { ApplianceCategoryValue } from "@/constants/appliances";
import type { ServiceItem } from "@/types/service";

export interface ServiceGroup {
  key: string;
  category: ApplianceCategoryValue;
  serviceType: string;
  subTypes: string[];
  // Same order as subTypes/prices, so picking a subtype resolves to the exact Service row to add to the cart.
  serviceIds: string[];
  prices: number[];
  image: string | null;
  desc: string[];
  warrantyDays: number;
}

// Types of the same appliance sharing a service and photo read as one card/listing ("Split / Window"),
// even when their price differs (e.g. AC Uninstall costs less for a window unit than a split one) — the
// group carries every subtype's own price, and the caller decides how to show that (an exact price when
// they're all equal, "From ₹<lowest>" otherwise). Grouping is by photo rather than price so two rows that
// happen to cost the same by coincidence don't merge, and two that differ on purpose still do.
export function groupServices(services: ServiceItem[]): ServiceGroup[] {
  const groups = new Map<string, ServiceGroup>();
  for (const s of services) {
    const key = [s.applianceCategory, s.serviceType, s.image ?? "", s.warrantyDurationDays].join("::");
    const existing = groups.get(key);
    if (existing) {
      existing.subTypes.push(s.applianceSubType);
      existing.serviceIds.push(s.id);
      existing.prices.push(s.price);
    } else {
      groups.set(key, {
        key,
        category: s.applianceCategory,
        serviceType: s.serviceType,
        subTypes: [s.applianceSubType],
        serviceIds: [s.id],
        prices: [s.price],
        image: s.image,
        desc: s.desc,
        warrantyDays: s.warrantyDurationDays,
      });
    }
  }
  return Array.from(groups.values());
}

// "₹299" when every subtype in the group costs the same, "From ₹399" when they don't.
export function groupPriceLabel(prices: number[]): string {
  const min = Math.min(...prices);
  return prices.every((p) => p === min) ? `₹${min}` : `From ₹${min}`;
}

// A struck-through "before" price next to the real one — a flat 20% markup on the lowest price in the
// group, computed rather than stored, so it never needs its own data entry.
export function strikeoutPrice(prices: number[]): number {
  return Math.round(Math.min(...prices) * 1.2);
}

// The "X% off" a strikeoutPrice implies, e.g. a flat 20% markup reads back as ~17% off.
export function discountPercent(prices: number[]): number {
  const real = Math.min(...prices);
  return Math.round((1 - real / strikeoutPrice(prices)) * 100);
}
