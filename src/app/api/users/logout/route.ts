import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {

        const res = NextResponse.json({
            message: "Logout Successfully",
            status: "success"
        })

        res.cookies.set("token", "", { httpOnly: true, expires : new Date(0) });

        return res;
        
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}