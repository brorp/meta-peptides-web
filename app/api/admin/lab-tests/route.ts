import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
    paginateResponse,
    errorResponse,
    successResponse,
} from "@/lib/api-response";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const keyword = searchParams.get("keyword") || "";

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from("lab_tests")
            .select("*, product:products(name)", { count: "exact" });

        if (keyword) {
            query = query.ilike("products.name", `%${keyword}%`);
        }

        const { data, error, count } = await query
            .order("test_date", { ascending: false })
            .range(from, to);

        if (error) return errorResponse(error.message, 400);

        return paginateResponse(
            data,
            page,
            limit,
            count || 0,
            "COAs retrieved successfully",
        );
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const { product_id, purity_level, test_date, report_url, report_images } = body;

        const { data, error } = await supabaseAdmin
            .from("lab_tests")
            .insert({
                product_id,
                purity_level,
                test_date,
                report_url: report_url || null,
                report_images: report_images || [],
            })
            .select()
            .single();

        if (error) return errorResponse(error.message, 400);

        return successResponse(data, "COA created successfully", 201);
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}
