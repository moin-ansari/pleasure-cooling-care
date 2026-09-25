import { PrismaClient } from "@prisma/client";
import servicesdata from "../src/db/servicesdata.json";

const db = new PrismaClient();

// Guarantee windows agreed with the owner; every other service starts at 0 (none) and is set in admin.
const WARRANTY_DAYS: Record<string, number> = {
    "AC Repair": 10,
    "Gas leak fix & refill": 90,
};

async function main() {
    for (const district of ["Bareilly", "Pilibhit"]) {
        await db.serviceArea.upsert({
            where: { state_district: { state: "Uttar Pradesh", district } },
            update: {},
            create: { state: "Uttar Pradesh", district, isActive: true },
        });
    }

    await db.settings.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1 },
    });

    // "Split / Window" and blank types become one row per AC type.
    for (const item of servicesdata) {
        const listed = item.acType.split("/").map((t) => t.trim()).filter(Boolean);
        const subTypes = listed.length ? listed : ["Split", "Window"];

        for (const applianceSubType of subTypes) {
            await db.service.upsert({
                where: {
                    applianceCategory_applianceSubType_serviceType: {
                        applianceCategory: "AC",
                        applianceSubType,
                        serviceType: item.serviceType,
                    },
                },
                update: {},
                create: {
                    applianceCategory: "AC",
                    applianceSubType,
                    serviceType: item.serviceType,
                    price: Number(item.price),
                    image: item.image,
                    desc: item.desc,
                    warrantyDurationDays: WARRANTY_DAYS[item.serviceType] ?? 0,
                },
            });
        }
    }

    console.log("Seeded service areas, settings and AC services");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(() => db.$disconnect());
