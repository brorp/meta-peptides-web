import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            name,
            domisili,
            shopee_username,
            whatsapp_number,
            product_id,
        } = body;

        if (!name || !domisili || !shopee_username || !whatsapp_number || !product_id) {
            return errorResponse("Semua field wajib diisi", 400);
        }

        // Optional: Get product name to store it as a snapshot in the preorder record
        const { data: product } = await supabaseAdmin
            .from("products")
            .select("name")
            .eq("id", product_id)
            .single();

        const { data, error } = await supabaseAdmin
            .from("shopee_preorders")
            .insert({
                name,
                domisili,
                shopee_username,
                whatsapp_number,
                product_id,
                product_name: product?.name || null,
            })
            .select("id, status, created_at")
            .single();

        if (error) {
            console.error("Supabase insert error:", error);
            return errorResponse("Gagal menyimpan data preorder", 500);
        }

        // Here we could send an email notification as well, depending on existing systems.

        return successResponse(data, "Preorder berhasil disimpan", 201);
    } catch (err: any) {
        console.error("Preorder API error:", err);
        return errorResponse("Terjadi kesalahan server", 500);
    }
}
