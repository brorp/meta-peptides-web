import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";

const ADMIN_PREORDER_SELECT =
    "id, name, domisili, shopee_username, whatsapp_number, product_id, product_name, status, created_at, products:product_id(name)";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireAdminApiSession(["root"]);
        if (auth.response) return auth.response;

        const { id } = await params;
        const { data, error } = await supabaseAdmin
            .from("shopee_preorders")
            .select(ADMIN_PREORDER_SELECT)
            .eq("id", id)
            .single();

        if (error) return errorResponse("Preorder not found", 404);

        return successResponse(data, "Preorder retrieved");
    } catch (err: any) {
        return errorResponse("Failed to load preorder", 500);
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireAdminApiSession(["root"]);
        if (auth.response) return auth.response;

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
            .select(ADMIN_PREORDER_SELECT)
            .single();

        if (error) return errorResponse("Failed to update preorder", 400);

        return successResponse(data, "Preorder updated");
    } catch (err: any) {
        return errorResponse("Failed to update preorder", 500);
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireAdminApiSession(["root"]);
        if (auth.response) return auth.response;

        const { id } = await params;

        const { error } = await supabaseAdmin
            .from("shopee_preorders")
            .delete()
            .eq("id", id);

        if (error) return errorResponse("Failed to delete preorder", 400);

        return successResponse(null, "Preorder deleted");
    } catch (err: any) {
        return errorResponse("Failed to delete preorder", 500);
    }
}
