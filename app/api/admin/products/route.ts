import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
    paginateResponse,
    errorResponse,
    successResponse,
} from "@/lib/api-response";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";

function hideCostOfGoodsForStaffAdmin(product: any, role: string | null) {
    if (role !== "admin") return product;

    const { cost_of_goods, ...safeProduct } = product;
    return safeProduct;
}

const ADMIN_PRODUCT_SELECT =
    "id, name, label, slug, price, cost_of_goods, original_price, stock, usage_days, image_url, category, purity, volume, formula, cas, short_desc, overview, storage_instruction, usage_instruction, dosing, complimentary_product_id, complimentary_quantity, inventory_type, is_active, created_at, updated_at";

export async function GET(req: NextRequest) {
    try {
        const role = await getAdminSessionFromCookies();
        if (!role) return errorResponse("Unauthorized", 401);

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const keyword = searchParams.get("keyword") || "";
        const category = searchParams.get("category") || "";

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from("products")
            .select(ADMIN_PRODUCT_SELECT, { count: "exact" });

        if (keyword) {
            query = query.or(`name.ilike.%${keyword}%,label.ilike.%${keyword}%`);
        }

        if (category) {
            query = query.ilike("category", `%${category}%`);
        }

        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) return errorResponse("Failed to load products", 400);

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

            if (complimentaryError) return errorResponse("Failed to load products", 400);

            complimentaryProductMap = new Map(
                (complimentaryProducts || []).map((product: any) => [
                    product.id,
                    product.name || "Complimentary Item",
                ]),
            );
        }

        const enrichedProducts = products.map((product: any) =>
            hideCostOfGoodsForStaffAdmin(
                {
                    ...product,
                    complimentary_product_name: product.complimentary_product_id
                        ? complimentaryProductMap.get(product.complimentary_product_id) || null
                        : null,
                    complimentary_quantity: Number(product.complimentary_quantity || 1),
                },
                role,
            ),
        );

        return paginateResponse(
            enrichedProducts,
            page,
            limit,
            count || 0,
            "Products retrieved",
        );
    } catch (err: any) {
        return errorResponse("Failed to load products", 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const role = await getAdminSessionFromCookies();
        if (!role) return errorResponse("Unauthorized", 401);

        const body = await req.json();

        // Auto-generate slug
        const slug =
            body.slug ||
            body.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
        const costOfGoods =
            role === "admin" ? 0 : Number(body.cost_of_goods || 0);

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
                inventory_type: ["product", "packaging", "supply"].includes(body.inventory_type)
                    ? body.inventory_type
                    : "product",
                is_active: body.is_active !== false,
            })
            .select(ADMIN_PRODUCT_SELECT)
            .single();

        if (error) return errorResponse("Failed to create product", 400);

        return successResponse(
            hideCostOfGoodsForStaffAdmin(data, role),
            "Product created",
            201,
        );
    } catch (err: any) {
        return errorResponse("Failed to create product", 500);
    }
}
