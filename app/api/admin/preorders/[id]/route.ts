import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const { data, error } = await supabaseAdmin
            .from("shopee_preorders")
            .select("*, products:product_id(*)")
            .eq("id", id)
            .single();

        if (error) return errorResponse(error.message, 404);

        return successResponse(data, "Preorder retrieved");
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

        // only allow updating status and basic fields
        const { data, error } = await supabaseAdmin
            .from("shopee_preorders")
            .update({
                status: body.status,
                // optionally we could allow admin to update other fields, but status is primary
            })
            .eq("id", id)
            .select()
            .single();

        if (error) return errorResponse(error.message, 400);

        return successResponse(data, "Preorder updated");
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
            .from("shopee_preorders")
            .delete()
            .eq("id", id);

        if (error) return errorResponse(error.message, 400);

        return successResponse(null, "Preorder deleted");
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}
