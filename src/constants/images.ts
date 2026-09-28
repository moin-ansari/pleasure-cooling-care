import type { ApplianceCategoryValue } from "@/constants/appliances";

// Where the owner-supplied appliance photos live once provided. Each component that uses one of these
// treats a failed image load as "not supplied yet" and falls back to the matching lucide icon — see
// CategoryImage in categoryIcons.tsx. Safe to reference before the files exist.
export const CATEGORY_IMAGES: Record<ApplianceCategoryValue, string> = {
    AC: "/images/appliances/ac.jpg",
    REFRIGERATOR: "/images/appliances/refrigerator.jpg",
    WASHING_MACHINE: "/images/appliances/washing-machine.jpg",
    GEYSER: "/images/appliances/geyser.jpg",
};

// A generic "professional at work" photo, used only when a technician has showOnWebsite on but hasn't
// uploaded their own photo.
export const PROFESSIONAL_PLACEHOLDER_IMAGE = "/images/hero/professional.jpg";
