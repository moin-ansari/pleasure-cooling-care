import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

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

    console.log("Seeded service areas and settings");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(() => db.$disconnect());
