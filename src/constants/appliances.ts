export const APPLIANCE_CATEGORIES = ["AC", "REFRIGERATOR", "WASHING_MACHINE", "GEYSER"] as const;

export type ApplianceCategoryValue = (typeof APPLIANCE_CATEGORIES)[number];

// "all" plus every category, used by any list that can be filtered/tabbed by appliance.
export type CategoryFilter = ApplianceCategoryValue | "all";

export const CATEGORY_LABELS: Record<ApplianceCategoryValue, string> = {
    AC: "Air Conditioner",
    REFRIGERATOR: "Refrigerator",
    WASHING_MACHINE: "Washing Machine",
    GEYSER: "Geyser",
};

// URL segment of each appliance's landing page, e.g. /bareilly/ac-repair-service
export const CATEGORY_SLUGS: Record<ApplianceCategoryValue, string> = {
    AC: "ac-repair-service",
    REFRIGERATOR: "refrigerator-repair-service",
    WASHING_MACHINE: "washing-machine-repair-service",
    GEYSER: "geyser-repair-service",
};

export function categoryFromSlug(slug: string): ApplianceCategoryValue | null {
    return APPLIANCE_CATEGORIES.find((c) => CATEGORY_SLUGS[c] === slug) ?? null;
}

export const SUB_TYPES: Record<ApplianceCategoryValue, string[]> = {
    AC: ["Split", "Window"],
    REFRIGERATOR: ["Single Door", "Double Door", "Side by Side"],
    WASHING_MACHINE: ["Top Load", "Front Load", "Semi-Automatic"],
    GEYSER: ["Electric", "Gas", "Instant", "Storage"],
};

export const SERVICE_TYPE_SUGGESTIONS: Record<ApplianceCategoryValue, string[]> = {
    AC: [
        "AC Repair",
        "AC Install",
        "AC Uninstall",
        "AC Service Lite",
        "Anti-rust deep clean AC service",
        "Gas leak fix & refill",
    ],
    REFRIGERATOR: ["Refrigerator Repair", "Refrigerator Install", "Refrigerator Uninstall", "Gas leak fix & refill"],
    WASHING_MACHINE: ["Washing Machine Repair", "Washing Machine Install", "Washing Machine Uninstall", "Washing Machine Deep Clean"],
    GEYSER: ["Geyser Repair", "Geyser Install", "Geyser Uninstall", "Geyser Descaling"],
};

// Spoken or typed names people use, for voice/chat input.
export const CATEGORY_ALIASES: Record<ApplianceCategoryValue, string[]> = {
    AC: ["ac", "a.c", "air conditioner", "air conditioning", "split ac", "window ac"],
    REFRIGERATOR: ["fridge", "frij", "frige", "refrigerator", "refrigirator", "freezer"],
    WASHING_MACHINE: ["washing machine", "washer", "washing", "laundry machine"],
    GEYSER: ["geyser", "water heater", "heater", "gyser"],
};

export function resolveCategory(text: string): ApplianceCategoryValue | null {
    const value = text.trim().toLowerCase();
    if (!value) return null;
    for (const category of APPLIANCE_CATEGORIES) {
        if (CATEGORY_ALIASES[category].some((alias) => value === alias || value.includes(alias))) return category;
    }
    return null;
}
