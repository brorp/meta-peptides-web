import { NextRequest, NextResponse } from "next/server";
import {
    validateAccessCode,
    createAdminSession,
    setAdminSessionCookie,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
    try {
        const { code } = await req.json();

        if (!code) {
            return NextResponse.json(
                { success: false, message: "Access code is required" },
                { status: 400 },
            );
        }

        const isValid = await validateAccessCode(code);

        if (!isValid) {
            return NextResponse.json(
                { success: false, message: "Invalid access code" },
                { status: 401 },
            );
        }

        const token = await createAdminSession();
        await setAdminSessionCookie(token);

        return NextResponse.json(
            { success: true, message: "Authenticated" },
            { status: 200 },
        );
    } catch (err: any) {
        return NextResponse.json(
            { success: false, message: err.message || "Internal Server Error" },
            { status: 500 },
        );
    }
}
