import { NextRequest } from "next/server";
import { errorResponse, paginateResponse } from "@/lib/api-response";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
    try {
        const role = await getAdminSessionFromCookies();
        if (role !== "root") return errorResponse("Forbidden", 403);

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabaseAdmin
            .from("customer_journey_logs")
            .select("*, customer:customers(full_name, username, whatsapp_phone)", {
                count: "exact",
            })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) return errorResponse(error.message, 400);

        return paginateResponse(
            data || [],
            page,
            limit,
            count || 0,
            "Daily task logs retrieved",
        );
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}
