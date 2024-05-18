import { connect } from "@/db/db";
import User from '@/models/user.model';
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { sendEmail } from "@/helpers/mailer";

export async function POST(request: NextRequest, response: NextResponse) {
    try {

        connect()
        const req = await request.json();
        const { secretCode, email, password } = req;

        if(secretCode !== "act598@admin"){
            return NextResponse.json({ status: "failed", message: "Invalid Secret Code!"})
        }

        const existingUser = await User.findOne({ email })

        if(existingUser) {
            return NextResponse.json({ status: "failed", message: "user already exist!", user: existingUser})
        }

        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);
        const newUser = new User({ secretCode, email, password: hashedPassword, isAdmin:true });

        const savedUser = await newUser.save();

        //send verification

        // await sendEmail({email, emailType: "VERIFY", userId: savedUser._id})

        return NextResponse.json({ status: "success", message: "user registered successfully", savedUser })
        
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}