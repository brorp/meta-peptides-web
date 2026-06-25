import { NextRequest } from "next/server";
import { errorResponse, paginateResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdminApiSession(["root"]);
        if (auth.response) return auth.response;

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabaseAdmin
            .from("customer_journey_logs")
            .select(
                "id, customer_id, from_journey, to_journey, task_type, evidence_url, order_id, notes, performed_by_role, created_at, customer:customers(full_name, username, whatsapp_phone)",
                { count: "exact" },
            )
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) return errorResponse("Failed to load daily task logs", 400);

        return paginateResponse(
            data || [],
            page,
            limit,
            count || 0,
            "Daily task logs retrieved",
        );
    } catch (err: any) {
        return errorResponse("Failed to load daily task logs", 500);
    }
}
