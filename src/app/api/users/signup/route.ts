import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { db } from "@/lib/db";
import { isRateLimited } from "@/helpers/rateLimit";

export async function POST(request: NextRequest, response: NextResponse) {
    try {

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
        if (isRateLimited(`signup:${ip}`, 5, 15 * 60 * 1000)) {
            return NextResponse.json({ status: "failed", message: "Too many attempts. Try again later." }, { status: 429 })
        }

        const req = await request.json();
        const { secretCode, password } = req;
        const email = String(req.email ?? "").trim().toLowerCase();

        if(!process.env.ADMIN_ACCESS_TOKEN || secretCode !== process.env.ADMIN_ACCESS_TOKEN){
            return NextResponse.json({ status: "failed", message: "Invalid Secret Code!"})
        }

        if(!email || typeof password !== "string" || password.length < 8){
            return NextResponse.json({ status: "failed", message: "Enter an email and a password of at least 8 characters"})
        }

        const existingUser = await db.adminUser.findUnique({ where: { email } })

        if(existingUser) {
            return NextResponse.json({ status: "failed", message: "user already exist!"})
        }

        const hashedPassword = await bcryptjs.hash(password, 10);

        await db.adminUser.create({ data: { email, password: hashedPassword, isAdmin: true } });

        return NextResponse.json({ status: "success", message: "user registered successfully" })

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
