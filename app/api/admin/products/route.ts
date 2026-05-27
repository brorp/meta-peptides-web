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
            query = query.ilike("category", `%${category}%`);
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) return errorResponse(error.message, 400);

        const products = data || [];
        const complimentaryProductIds = Array.from(
            new Set(
                products
                    .map((product: any) => product.complimentary_product_id)
                    .filter(Boolean),
            ),
        );

        let complimentaryProductMap = new Map<string, string>();
        if (complimentaryProductIds.length > 0) {
            const { data: complimentaryProducts, error: complimentaryError } =
                await supabaseAdmin
                    .from("products")
                    .select("id, name")
                    .in("id", complimentaryProductIds);

            if (complimentaryError) return errorResponse(complimentaryError.message, 400);

            complimentaryProductMap = new Map(
                (complimentaryProducts || []).map((product: any) => [
                    product.id,
                    product.name || "Complimentary Item",
                ]),
            );
        }

        const enrichedProducts = products.map((product: any) => ({
            ...product,
            complimentary_product_name: product.complimentary_product_id
                ? complimentaryProductMap.get(product.complimentary_product_id) || null
                : null,
            complimentary_quantity: Number(product.complimentary_quantity || 1),
        }));

        return paginateResponse(
            enrichedProducts,
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
        const costOfGoods = Number(body.cost_of_goods || 0);

        if (!Number.isFinite(costOfGoods) || costOfGoods < 0) {
            return errorResponse("COGS must be a valid non-negative number", 400);
        }

        const { data, error } = await supabaseAdmin
            .from("products")
            .insert({
                name: body.name,
                label: body.label || null,
                slug,
                price: parseFloat(body.price),
                cost_of_goods: costOfGoods,
                original_price: body.original_price
                    ? parseFloat(body.original_price)
                    : null,
                stock: parseInt(body.stock) || 0,
                usage_days: Math.max(0, parseInt(body.usage_days) || 0),
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
                complimentary_product_id: body.complimentary_product_id || null,
                complimentary_quantity: body.complimentary_product_id
                    ? Math.max(1, parseInt(body.complimentary_quantity) || 1)
                    : 1,
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
