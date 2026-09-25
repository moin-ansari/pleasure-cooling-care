import { NextRequest, NextResponse } from "next/server";
import { getTechnicianSelf } from "@/lib/domain/technicians";
import { getTechnicianId, technicianUnauthorized } from "@/lib/technicianAuth";

export async function GET(request: NextRequest) {
    try {
        const id = await getTechnicianId(request);
        if (!id) return technicianUnauthorized();

        const data = await getTechnicianSelf(id);
        if (!data) return technicianUnauthorized();

        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        console.error("technician me failed", error);
        return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
    }
}
