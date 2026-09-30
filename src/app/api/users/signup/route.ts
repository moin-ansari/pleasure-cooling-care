import { connect } from "@/db/db";
import User from '@/models/user.model';
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { isRateLimited } from "@/helpers/rateLimit";

export async function POST(request: NextRequest, response: NextResponse) {
    try {

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
        if (isRateLimited(`signup:${ip}`, 5, 15 * 60 * 1000)) {
            return NextResponse.json({ status: "failed", message: "Too many attempts. Try again later." }, { status: 429 })
        }

        const req = await request.json();
        const { secretCode, email, password } = req;

        if(!process.env.ADMIN_ACCESS_TOKEN || secretCode !== process.env.ADMIN_ACCESS_TOKEN){
            return NextResponse.json({ status: "failed", message: "Invalid Secret Code!"})
        }

        connect()

        const existingUser = await User.findOne({ email })

        if(existingUser) {
            return NextResponse.json({ status: "failed", message: "user already exist!"})
        }

        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);
        const newUser = new User({ secretCode, email, password: hashedPassword, isAdmin:true });

        await newUser.save();

        return NextResponse.json({ status: "success", message: "user registered successfully" })

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
