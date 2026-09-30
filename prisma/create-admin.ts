// Creates the owner login. There is no public sign-up, so this is how the first admin account is made.
// Usage: npm run admin:create -- owner@example.com "A strong password" "Owner name"
import bcryptjs from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
    const [emailArg, password, name] = process.argv.slice(2);
    const email = (emailArg ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 8) {
        console.error('Usage: npm run admin:create -- <email> "<password, at least 8 characters>" "<name>"');
        process.exit(1);
    }

    const data = { password: await bcryptjs.hash(password, 10), isAdmin: true, role: "OWNER" as const, storeId: null, isActive: true, name: name ?? "" };
    const user = await db.adminUser.upsert({ where: { email }, update: data, create: { email, ...data } });
    console.log(`Owner login ready for ${user.email}`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(() => db.$disconnect());
