import { NextRequest, NextResponse } from "next/server";
import { connect } from '@/db/db';
import { getDataFromToken } from "@/helpers/getDataFromToken";
import User from '@/models/user.model';

export async function POST(request: NextRequest) {
    try {

        connect();

        const userId: any = getDataFromToken(request);        

        const user = await User.findOne({ _id: userId }).select("-password");

        if(!user) {
            return NextResponse.json({ status: 'failed', message: "user not found"})
        }

        return NextResponse.json({ status: 'success', message: "user found", data: user})
        
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}