import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        const { data, error } = await supabaseAdmin
            .from("products")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return errorResponse("Product not found", 404);

        return successResponse(data, "Product retrieved");
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const body = await req.json();

        const updateData: any = {};
        const fields = [
            "name", "label", "slug", "price", "original_price", "stock",
            "image_url", "category", "purity", "volume", "formula", "cas",
            "short_desc", "overview", "storage_instruction", "usage_instruction",
            "dosing", // "is_active", temporarily removed
        ];

        for (const field of fields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        if (updateData.price) updateData.price = parseFloat(updateData.price);
        if (updateData.original_price)
            updateData.original_price = parseFloat(updateData.original_price);
        if (updateData.stock !== undefined)
            updateData.stock = parseInt(updateData.stock);

        const { data, error } = await supabaseAdmin
            .from("products")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) return errorResponse(error.message, 400);

        return successResponse(data, "Product updated");
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        const { error } = await supabaseAdmin
            .from("products")
            .delete()
            .eq("id", id);

        if (error) return errorResponse(error.message, 400);

        return successResponse(null, "Product deleted");
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}
