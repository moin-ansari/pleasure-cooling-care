import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken"
import { db } from "@/lib/db";
import { ADMIN_COOKIE } from "@/helpers/getDataFromToken";
import { clearRateLimit, isRateLimited } from "@/helpers/rateLimit";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest, response: NextResponse) {
    try {

        const req = await request.json();

        const email = String(req.email ?? "").trim().toLowerCase();
        const password = String(req.password ?? "");

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
        const key = `login:${ip}:${email}`;

        if (isRateLimited(key, MAX_ATTEMPTS, WINDOW_MS)) {
            return NextResponse.json({ status: "failed", message: "Too many attempts. Try again in 15 minutes." }, { status: 429 })
        }

        const existingUser = await db.adminUser.findUnique({ where: { email } })

        const validatePassword = existingUser
            ? await bcryptjs.compare(password, existingUser.password)
            : false;

        if(!existingUser || !validatePassword || !existingUser.isActive){
            return NextResponse.json({ status: "failed", message: "Invalid email or password" })
        }

        clearRateLimit(key);

        const tokenPayload = {
            id: existingUser.id,
            email: existingUser.email
        }

        const token = jwt.sign( tokenPayload, process.env.SECRET_TOKEN!, { expiresIn: '1d' })

        const res = NextResponse.json({
            message: "logged in success",
            status: "success"
        })

        res.cookies.set(ADMIN_COOKIE, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24,
        });

        return res;

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
