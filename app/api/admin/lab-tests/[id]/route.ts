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
            .from("lab_tests")
            .select("*, product:products(name)")
            .eq("id", id)
            .single();

        if (error) return errorResponse(error.message, 404);

        return successResponse(data, "COA retrieved successfully");
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
            .select()
            .single();

        if (error) return errorResponse(error.message, 400);

        return successResponse(data, "COA updated successfully");
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

        // Optionally, delete images from storage if needed before deleting the record
        // ...

        const { error } = await supabaseAdmin
            .from("lab_tests")
            .delete()
            .eq("id", id);

        if (error) return errorResponse(error.message, 400);

        return successResponse(null, "COA deleted successfully");
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}
