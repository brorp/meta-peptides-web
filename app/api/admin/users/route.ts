import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { paginateResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const keyword = searchParams.get("keyword") || "";

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact" });

        if (keyword) {
            query = query.or(
                `email.ilike.%${keyword}%`,
            );
        }

        const { data, error, count } = await query
            .order("id", { ascending: false })
            .range(from, to);

        if (error) return errorResponse(error.message, 400);

        return paginateResponse(data, page, limit, count || 0, "Users retrieved");
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}
