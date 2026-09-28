import type { ApplianceCategoryValue } from "@/constants/appliances";

// Owner-supplied appliance photos. Each component that uses one of these treats a failed image load as
// "not supplied yet" and falls back to the matching lucide icon — see CategoryImage in categoryIcons.tsx.
// Safe to reference even if a file is later removed.
export const CATEGORY_IMAGES: Record<ApplianceCategoryValue, string> = {
    AC: "/images/appliances/ac.webp",
    REFRIGERATOR: "/images/appliances/refrigerator.webp",
    WASHING_MACHINE: "/images/appliances/washing-machine.webp",
    GEYSER: "/images/appliances/geyser.webp",
};

// A generic "professional at work" photo, used only when a technician has showOnWebsite on but hasn't
// uploaded their own photo.
export const PROFESSIONAL_PLACEHOLDER_IMAGE = "/images/hero/professional.jpg";
