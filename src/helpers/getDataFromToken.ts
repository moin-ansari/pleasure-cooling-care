import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export const ADMIN_COOKIE = "actechtoken";

export const getDataFromToken = (request : NextRequest) => {
    try {

        const token = request.cookies.get(ADMIN_COOKIE)?.value || "";

        const decodedToken: any = jwt.verify(token, process.env.SECRET_TOKEN!);

        return decodedToken.id;

    } catch (error: any) {
        throw new Error(error.message)
    }
}
