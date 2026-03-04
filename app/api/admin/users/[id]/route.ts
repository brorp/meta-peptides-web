import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        const { data: user, error } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !user) return errorResponse("User not found", 404);

        // Get user orders
        const { data: orders } = await supabaseAdmin
            .from("orders")
            .select("*, order_items(*, products(name))")
            .eq("user_id", id)
            .order("created_at", { ascending: false })
            .limit(10);

        return successResponse({ ...user, orders: orders || [] }, "User retrieved");
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

        // Only update fields that exist in the profiles table
        const updateData: Record<string, any> = {};
        for (const [key, value] of Object.entries(body)) {
            if (value !== undefined) {
                updateData[key] = value;
            }
        }

        const { data, error } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) return errorResponse(error.message, 400);

        return successResponse(data, "User updated");
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

        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) return errorResponse(error.message, 400);

        return successResponse(null, "User deleted");
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}
