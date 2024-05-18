import { connect } from "@/db/db";
import User from '@/models/user.model';
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest, response: NextResponse) {
    try {

        connect()
        const req = await request.json();

        const { email, password } = req;

        const existingUser = await User.findOne({ email })

        // if(!existingUser.isVerified){
        //     return NextResponse.json({ status: "failed", message: "please verify email!" })
        // }

        if(!existingUser) {
            return NextResponse.json({ status: "failed", message: "user does not exist!" })
        }

        const validatePassword = await bcryptjs.compare(password, existingUser.password);

        if(!validatePassword){
            return NextResponse.json({ status: "failed", message: "user does not exist!" })
        }

        const tokenPayload = {
            id: existingUser._id,
            username: existingUser.username,
            email: existingUser.email
        }

        const token = jwt.sign( tokenPayload, process.env.SECRET_TOKEN!, { expiresIn: '1d' })

        const res = NextResponse.json({
            message: "logged in success",
            status: "success"
        })

        res.cookies.set("actechtoken", token, { httpOnly: true });

        return res;
        
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}