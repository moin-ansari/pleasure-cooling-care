
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connect } from '@/db/db';
import User from '@/models/user.model';

export async function POST (request: NextRequest) {
    try {
        connect();

        const req = await request.json();
        const { token } = req;

        const user = await User.findOne({ verifyToken : token, verifyTokenExpiry: {$gt: Date.now()} });
        if(!user){
            return NextResponse.json({ status: "failed", message: "Invalid verification token" });
        }

        user.isVerified = true;
        user.verifyToken = undefined;
        user.verifyTokenExpiry = undefined;

        await user.save()

        return NextResponse.json({ status: "success", message: "email verified!" });
    } catch (error: any) {
        return NextResponse.json({ status: "failed", message: error.message })
    }
}