import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
    paginateResponse,
    errorResponse,
} from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";

const ADMIN_PREORDER_SELECT =
    "id, name, domisili, shopee_username, whatsapp_number, product_id, product_name, status, created_at, products(name)";

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdminApiSession(["root"]);
        if (auth.response) return auth.response;

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const keyword = searchParams.get("keyword") || "";
        const status = searchParams.get("status") || "";

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from("shopee_preorders")
            .select(ADMIN_PREORDER_SELECT, { count: "exact" });

        if (keyword) {
            query = query.or(`name.ilike.%${keyword}%,shopee_username.ilike.%${keyword}%,whatsapp_number.ilike.%${keyword}%`);
        }

        if (status) {
            query = query.eq("status", status);
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) return errorResponse("Failed to load preorders", 400);

        return paginateResponse(
            data,
            page,
            limit,
            count || 0,
            "Preorders retrieved",
        );
    } catch (err: any) {
        return errorResponse("Failed to load preorders", 500);
    }
}
