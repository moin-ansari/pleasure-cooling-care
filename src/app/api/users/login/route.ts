import { connect } from "@/db/db";
import User from '@/models/user.model';
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken"
import { ADMIN_COOKIE } from "@/helpers/getDataFromToken";
import { clearRateLimit, isRateLimited } from "@/helpers/rateLimit";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest, response: NextResponse) {
    try {

        const req = await request.json();

        const { email, password } = req;

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
        const key = `login:${ip}:${String(email).toLowerCase()}`;

        if (isRateLimited(key, MAX_ATTEMPTS, WINDOW_MS)) {
            return NextResponse.json({ status: "failed", message: "Too many attempts. Try again in 15 minutes." }, { status: 429 })
        }

        connect()

        const existingUser = await User.findOne({ email })

        const validatePassword = existingUser
            ? await bcryptjs.compare(password, existingUser.password)
            : false;

        if(!existingUser || !validatePassword){
            return NextResponse.json({ status: "failed", message: "Invalid email or password" })
        }

        clearRateLimit(key);

        const tokenPayload = {
            id: existingUser._id,
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
