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
        const category = searchParams.get("category") || "";

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from("products")
            .select("*", { count: "exact" });

        if (keyword) {
            query = query.or(`name.ilike.%${keyword}%,label.ilike.%${keyword}%`);
        }

        if (category) {
            query = query.eq("category", category);
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
            "Products retrieved",
        );
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Auto-generate slug
        const slug =
            body.slug ||
            body.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");

        const { data, error } = await supabaseAdmin
            .from("products")
            .insert({
                name: body.name,
                label: body.label || null,
                slug,
                price: parseFloat(body.price),
                original_price: body.original_price
                    ? parseFloat(body.original_price)
                    : null,
                stock: parseInt(body.stock) || 0,
                image_url: body.image_url || null,
                category: body.category || null,
                purity: body.purity || null,
                volume: body.volume || null,
                formula: body.formula || null,
                cas: body.cas || null,
                short_desc: body.short_desc || null,
                overview: body.overview || null,
                storage_instruction: body.storage_instruction || null,
                usage_instruction: body.usage_instruction || null,
                dosing: body.dosing || null,
                is_active: body.is_active !== false,
            })
            .select()
            .single();

        if (error) return errorResponse(error.message, 400);

        return successResponse(data, "Product created", 201);
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}
