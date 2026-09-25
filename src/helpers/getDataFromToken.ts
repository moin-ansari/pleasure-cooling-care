import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export const ADMIN_COOKIE = "actechtoken";

export const getDataFromToken = (request : NextRequest) => {
    try {

        const token = request.cookies.get(ADMIN_COOKIE)?.value || "";

        const decodedToken: any = jwt.verify(token, process.env.SECRET_TOKEN!);

        // Admin tokens carry no role. A technician's token must never open admin routes.
        if (decodedToken.role) throw new Error("Not an admin token");

        return decodedToken.id;

    } catch (error: any) {
        throw new Error(error.message)
    }
}
