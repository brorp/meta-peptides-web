import { NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";

export async function GET() {
    const role = await getAdminSessionFromCookies();

    if (!role) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 },
        );
    }

    return NextResponse.json({
        success: true,
        data: { role },
    });
}
