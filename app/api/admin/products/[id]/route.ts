import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";

function hideCostOfGoodsForStaffAdmin(product: any, role: string | null) {
    if (role !== "admin") return product;

    const { cost_of_goods, ...safeProduct } = product;
    return safeProduct;
}

const ADMIN_PRODUCT_SELECT =
    "id, name, label, slug, price, cost_of_goods, original_price, stock, usage_days, image_url, category, purity, volume, formula, cas, short_desc, overview, storage_instruction, usage_instruction, dosing, complimentary_product_id, complimentary_quantity, inventory_type, is_active, created_at, updated_at";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const role = await getAdminSessionFromCookies();
        if (!role) return errorResponse("Unauthorized", 401);

        const { id } = await params;

        const { data, error } = await supabaseAdmin
            .from("products")
            .select(ADMIN_PRODUCT_SELECT)
            .eq("id", id)
            .single();

        if (error || !data) return errorResponse("Product not found", 404);

        let complimentaryProductName: string | null = null;
        if (data.complimentary_product_id) {
            const { data: complimentaryProduct } = await supabaseAdmin
                .from("products")
                .select("name")
                .eq("id", data.complimentary_product_id)
                .maybeSingle();

            complimentaryProductName = complimentaryProduct?.name || null;
        }

        return successResponse(
            hideCostOfGoodsForStaffAdmin(
                {
                    ...data,
                    complimentary_product_name: complimentaryProductName,
                    complimentary_quantity: Number(data.complimentary_quantity || 1),
                },
                role,
            ),
            "Product retrieved",
        );
    } catch (err: any) {
        return errorResponse("Failed to load product", 500);
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const role = await getAdminSessionFromCookies();
        if (!role) return errorResponse("Unauthorized", 401);

        const { id } = await params;
        const body = await req.json();

        const updateData: any = {};
        const fields = [
            "name", "label", "slug", "price", "original_price", "stock", "usage_days",
            "image_url", "category", "purity", "volume", "formula", "cas",
            "short_desc", "overview", "storage_instruction", "usage_instruction",
            "dosing", "complimentary_product_id", "complimentary_quantity",
            "inventory_type", "is_active",
        ];
        if (role !== "admin") {
            fields.push("cost_of_goods");
        }

        for (const field of fields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        if (updateData.price !== undefined)
            updateData.price = parseFloat(updateData.price);
        if (updateData.cost_of_goods !== undefined) {
            const costOfGoods = Number(updateData.cost_of_goods || 0);
            if (!Number.isFinite(costOfGoods) || costOfGoods < 0) {
                return errorResponse("COGS must be a valid non-negative number", 400);
            }
            updateData.cost_of_goods = costOfGoods;
        }
        if (updateData.original_price !== undefined && updateData.original_price !== null)
            updateData.original_price = parseFloat(updateData.original_price);
        if (updateData.stock !== undefined)
            updateData.stock = parseInt(updateData.stock);
        if (updateData.usage_days !== undefined)
            updateData.usage_days = Math.max(
                0,
                parseInt(updateData.usage_days) || 0,
            );
        if (updateData.complimentary_product_id === "")
            updateData.complimentary_product_id = null;
        if (updateData.complimentary_quantity !== undefined) {
            updateData.complimentary_quantity = Math.max(
                1,
                parseInt(updateData.complimentary_quantity) || 1,
            );
        }
        if (updateData.is_active !== undefined) {
            updateData.is_active = updateData.is_active !== false;
        }
        if (updateData.inventory_type !== undefined) {
            updateData.inventory_type = ["product", "packaging", "supply"].includes(
                updateData.inventory_type,
            )
                ? updateData.inventory_type
                : "product";
        }
        if (!updateData.complimentary_product_id) {
            updateData.complimentary_quantity = 1;
        }

        const { data, error } = await supabaseAdmin
            .from("products")
            .update(updateData)
            .eq("id", id)
            .select(ADMIN_PRODUCT_SELECT)
            .single();

        if (error) return errorResponse("Failed to update product", 400);

        if (updateData.cost_of_goods !== undefined) {
            await supabaseAdmin
                .from("order_items")
                .update({ cogs_at_purchase: updateData.cost_of_goods })
                .eq("product_id", id)
                .eq("cogs_at_purchase", 0);
        }

        return successResponse(
            hideCostOfGoodsForStaffAdmin(data, role),
            "Product updated",
        );
    } catch (err: any) {
        return errorResponse("Failed to update product", 500);
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const role = await getAdminSessionFromCookies();
        if (!role) return errorResponse("Unauthorized", 401);

        const { id } = await params;

        const { error } = await supabaseAdmin
            .from("products")
            .delete()
            .eq("id", id);

        if (error) return errorResponse("Failed to delete product", 400);

        return successResponse(null, "Product deleted");
    } catch (err: any) {
        return errorResponse("Failed to delete product", 500);
    }
}
