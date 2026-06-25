import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";

const USER_PROFILE_SELECT = "id, email, full_name, phone, role, created_at";
const USER_ORDER_HISTORY_SELECT =
    "id, total_price, status, created_at, order_source, manual_reference";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireAdminApiSession();
        if (auth.response) return auth.response;

        const { id } = await params;
        const { data: authUserData, error: authUserError } =
            await supabaseAdmin.auth.admin.getUserById(id);

        if (authUserError || !authUserData?.user) {
            return errorResponse("User not found", 404);
        }

        const { data: user, error } = await supabaseAdmin
            .from("profiles")
            .select(USER_PROFILE_SELECT)
            .eq("id", id)
            .maybeSingle();

        if (error) return errorResponse("Failed to load user profile", 400);

        // Get user orders
        const { data: orders } = await supabaseAdmin
            .from("orders")
            .select(USER_ORDER_HISTORY_SELECT)
            .eq("user_id", id)
            .order("created_at", { ascending: false })
            .limit(10);

        const authUser = authUserData.user;

        return successResponse(
            {
                ...(user || {}),
                id: authUser.id,
                email: authUser.email || user?.email || null,
                full_name:
                    user?.full_name ||
                    authUser.user_metadata?.full_name ||
                    authUser.user_metadata?.name ||
                    null,
                phone: user?.phone || authUser.phone || null,
                role: user?.role || authUser.app_metadata?.role || "customer",
                created_at: user?.created_at || authUser.created_at || null,
                has_profile: !!user,
                orders: orders || [],
            },
            "User retrieved",
        );
    } catch (err: any) {
        return errorResponse("Failed to load user", 500);
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireAdminApiSession();
        if (auth.response) return auth.response;

        const { id } = await params;
        const body = await req.json();
        const { data: authUserData, error: authUserError } =
            await supabaseAdmin.auth.admin.getUserById(id);

        if (authUserError || !authUserData?.user) {
            return errorResponse("User not found", 404);
        }

        const updateData: Record<string, any> = {};
        if (body.full_name !== undefined) {
            updateData.full_name = String(body.full_name || "").trim() || null;
        }
        if (body.phone !== undefined) {
            updateData.phone = String(body.phone || "").trim() || null;
        }
        if (
            auth.role === "root" &&
            body.role !== undefined &&
            ["customer", "admin"].includes(String(body.role))
        ) {
            updateData.role = String(body.role);
        }

        const { data, error } = await supabaseAdmin
            .from("profiles")
            .upsert(
                {
                    id,
                    email: authUserData.user.email || null,
                    ...updateData,
                },
                { onConflict: "id" },
            )
            .select(USER_PROFILE_SELECT)
            .single();

        if (error) return errorResponse("Failed to update user", 400);

        return successResponse(data, "User updated");
    } catch (err: any) {
        return errorResponse("Failed to update user", 500);
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

        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) return errorResponse("Failed to delete user", 400);

        return successResponse(null, "User deleted");
    } catch (err: any) {
        return errorResponse("Failed to delete user", 500);
    }
}
