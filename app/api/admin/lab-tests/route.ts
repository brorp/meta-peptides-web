import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
    paginateResponse,
    errorResponse,
    successResponse,
} from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";

const ADMIN_LAB_TEST_SELECT =
    "id, product_id, purity_level, test_date, report_url, report_images, created_at, updated_at, product:products(name)";

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdminApiSession(["root"]);
        if (auth.response) return auth.response;

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const keyword = searchParams.get("keyword") || "";

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from("lab_tests")
            .select(ADMIN_LAB_TEST_SELECT, { count: "exact" });

        if (keyword) {
            query = query.ilike("products.name", `%${keyword}%`);
        }

        const { data, error, count } = await query
            .order("test_date", { ascending: false })
            .range(from, to);

        if (error) return errorResponse("Failed to load COAs", 400);

        return paginateResponse(
            data,
            page,
            limit,
            count || 0,
            "COAs retrieved successfully",
        );
    } catch (err: any) {
        return errorResponse("Failed to load COAs", 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdminApiSession(["root"]);
        if (auth.response) return auth.response;

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
            .select(ADMIN_LAB_TEST_SELECT)
            .single();

        if (error) return errorResponse("Failed to create COA", 400);

        return successResponse(data, "COA created successfully", 201);
    } catch (err: any) {
        return errorResponse("Failed to create COA", 500);
    }
}
