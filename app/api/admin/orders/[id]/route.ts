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
            .from("orders")
            .select("*, order_items(*, products(name, image_url, slug)), payments(*)")
            .eq("id", id)
            .single();

        if (error || !data) return errorResponse("Order not found", 404);

        return successResponse(data, "Order retrieved");
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

        if (body.status) updateData.status = body.status;
        if (body.tracking_number !== undefined)
            updateData.tracking_number = body.tracking_number;
        if (body.note !== undefined) updateData.note = body.note;

        const { data, error } = await supabaseAdmin
            .from("orders")
            .update(updateData)
            .eq("id", id)
            .select("*, order_items(*, products(name, image_url)), payments(*)")
            .single();

        if (error) return errorResponse(error.message, 400);

        return successResponse(data, "Order updated");
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}
