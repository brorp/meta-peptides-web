import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin-auth";

export async function POST() {
    try {
        await clearAdminSession();
        return NextResponse.json(
            { success: true, message: "Logged out" },
            { status: 200 },
        );
    } catch (err: any) {
        return NextResponse.json(
            { success: false, message: err.message || "Internal Server Error" },
            { status: 500 },
        );
    }
}
