import { connect } from "@/db/db";
import User from '@/models/user.model';
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { sendEmail } from "@/helpers/mailer";

export async function POST(request: NextRequest, response: NextResponse) {
    try {

        connect()
        const req = await request.json();
        const { username, email, password } = req;

        const existingUser = await User.findOne({ email })

        if(existingUser) {
            return NextResponse.json({ status: "failed", message: "user already exist!", user: existingUser})
        }

        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);
        const newUser = new User({ username, email, password: hashedPassword });

        const savedUser = await newUser.save();

        //send verification

        // await sendEmail({email, emailType: "VERIFY", userId: savedUser._id})

        return NextResponse.json({ status: "success", message: "user registered successfully", savedUser })
        
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}