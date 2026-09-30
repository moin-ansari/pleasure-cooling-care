import servicesdata from "@/db/servicesdata.json";

export function getServicePrice(serviceType: string, acType: string): number | null {
    const type = String(acType || "").toLowerCase();

    const item = servicesdata.find((service) => {
        if (service.serviceType !== serviceType) return false;
        const listed = service.acType
            .toLowerCase()
            .split("/")
            .map((t) => t.trim())
            .filter(Boolean);
        return listed.length === 0 || listed.includes(type);
    });

    return item ? Number(item.price) : null;
}
