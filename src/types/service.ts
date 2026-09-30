import type { ApplianceCategoryValue } from "@/constants/appliances";

export interface ServiceItem {
    id: string;
    applianceCategory: ApplianceCategoryValue;
    applianceSubType: string;
    serviceType: string;
    price: number;
    image: string | null;
    desc: string[];
    warrantyDurationDays: number;
    isActive: boolean;
}
