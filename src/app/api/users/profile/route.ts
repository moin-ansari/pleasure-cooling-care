import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDataFromToken } from "@/helpers/getDataFromToken";

export async function POST(request: NextRequest) {
    try {

        const userId: string = getDataFromToken(request);

        const user = await db.adminUser.findUnique({
            where: { id: userId },
            select: { id: true, email: true, isAdmin: true, createdAt: true },
        });

        if(!user) {
            return NextResponse.json({ status: 'failed', message: "user not found"})
        }

        return NextResponse.json({ status: 'success', message: "user found", data: user})

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message})
    }
}
