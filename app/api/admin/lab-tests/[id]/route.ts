import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";

const ADMIN_LAB_TEST_SELECT =
    "id, product_id, purity_level, test_date, report_url, report_images, created_at, updated_at, product:products(name)";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireAdminApiSession(["root"]);
        if (auth.response) return auth.response;

        const { id } = await params;
        const { data, error } = await supabaseAdmin
            .from("lab_tests")
            .select(ADMIN_LAB_TEST_SELECT)
            .eq("id", id)
            .single();

        if (error) return errorResponse("COA not found", 404);

        return successResponse(data, "COA retrieved successfully");
    } catch (err: any) {
        return errorResponse("Failed to load COA", 500);
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

        const { product_id, purity_level, test_date, report_url, report_images } = body;

        const { data, error } = await supabaseAdmin
            .from("lab_tests")
            .update({
                product_id,
                purity_level,
                test_date,
                report_url: report_url || null,
                report_images: report_images || [],
            })
            .eq("id", id)
            .select(ADMIN_LAB_TEST_SELECT)
            .single();

        if (error) return errorResponse("Failed to update COA", 400);

        return successResponse(data, "COA updated successfully");
    } catch (err: any) {
        return errorResponse("Failed to update COA", 500);
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

        // Optionally, delete images from storage if needed before deleting the record
        // ...

        const { error } = await supabaseAdmin
            .from("lab_tests")
            .delete()
            .eq("id", id);

        if (error) return errorResponse("Failed to delete COA", 400);

        return successResponse(null, "COA deleted successfully");
    } catch (err: any) {
        return errorResponse("Failed to delete COA", 500);
    }
}
