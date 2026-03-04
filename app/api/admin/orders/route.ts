import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { paginateResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status") || "";
        const keyword = searchParams.get("keyword") || "";

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from("orders")
            .select("*, order_items(*, products(name, image_url)), payments(*)", {
                count: "exact",
            });

        if (status) {
            query = query.eq("status", status);
        }

        if (keyword) {
            query = query.or(
                `shipping_name.ilike.%${keyword}%,shipping_email.ilike.%${keyword}%,id.ilike.%${keyword}%`,
            );
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
            "Orders retrieved",
        );
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}
