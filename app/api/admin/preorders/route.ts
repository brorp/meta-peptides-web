import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
    paginateResponse,
    errorResponse,
} from "@/lib/api-response";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const keyword = searchParams.get("keyword") || "";
        const status = searchParams.get("status") || "";

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from("shopee_preorders")
            .select("*, products(name)", { count: "exact" });

        if (keyword) {
            query = query.or(`name.ilike.%${keyword}%,shopee_username.ilike.%${keyword}%,whatsapp_number.ilike.%${keyword}%`);
        }

        if (status) {
            query = query.eq("status", status);
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) return errorResponse(error.message, 400);

        return paginateResponse(
            data,
            page,
            limit,
            count || 0,
            "Preorders retrieved",
        );
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}
