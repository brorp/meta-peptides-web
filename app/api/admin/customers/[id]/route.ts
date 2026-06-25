import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
    isCustomerJourneyStage,
    normalizePhone,
    normalizeUsername,
} from "@/lib/customer-sync";
import { requireAdminApiSession } from "@/lib/admin-api";

const ADMIN_CUSTOMER_SELECT =
    "id, full_name, username, whatsapp_phone, email, domicile, lead_source, current_journey, notes, updated_at, last_order:orders!customers_last_order_id_fkey(id, total_price, order_source, manual_reference)";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireAdminApiSession();
        if (auth.response) return auth.response;

        const { id } = await params;

        const { data, error } = await supabaseAdmin
            .from("customers")
            .select(ADMIN_CUSTOMER_SELECT)
            .eq("id", id)
            .single();

        if (error || !data) return errorResponse("Customer not found", 404);

        return successResponse(data, "Customer retrieved");
    } catch (err: any) {
        return errorResponse("Failed to load customer", 500);
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
        const updateData: Record<string, any> = {};

        if (body.full_name !== undefined) {
            const fullName = String(body.full_name || "").trim();
            if (!fullName) return errorResponse("Customer name is required", 400);
            updateData.full_name = fullName;
        }

        if (body.username !== undefined) {
            updateData.username = normalizeUsername(body.username);
        }

        if (body.whatsapp_phone !== undefined) {
            updateData.whatsapp_phone = normalizePhone(body.whatsapp_phone);
        }

        if (body.email !== undefined) {
            const email = String(body.email || "").trim().toLowerCase();
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return errorResponse("Customer email is invalid", 400);
            }
            updateData.email = email || null;
        }

        if (body.domicile !== undefined) {
            updateData.domicile = String(body.domicile || "").trim() || null;
        }

        if (body.notes !== undefined) {
            updateData.notes = String(body.notes || "").trim() || null;
        }

        if (body.current_journey !== undefined) {
            if (!isCustomerJourneyStage(body.current_journey)) {
                return errorResponse("Invalid customer journey stage", 400);
            }
            updateData.current_journey = body.current_journey;
            updateData.journey_updated_at = new Date().toISOString();
            if (body.current_journey === "closing" && !body.closing_at) {
                updateData.closing_at = new Date().toISOString();
            }
        }

        if (body.closing_at !== undefined) {
            updateData.closing_at = body.closing_at || null;
        }

        if (!Object.keys(updateData).length) {
            return errorResponse("No customer changes were provided", 400);
        }

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from("customers")
            .update(updateData)
            .eq("id", id)
            .select(ADMIN_CUSTOMER_SELECT)
            .single();

        if (error) {
            if (error.code === "23505") {
                return errorResponse(
                    "Customer with the same username or WhatsApp number already exists",
                    409,
                );
            }
            return errorResponse("Failed to update customer", 400);
        }

        return successResponse(data, "Customer updated");
    } catch (err: any) {
        return errorResponse("Failed to update customer", 500);
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireAdminApiSession();
        if (auth.response) return auth.response;

        const { id } = await params;
        const { error } = await supabaseAdmin.from("customers").delete().eq("id", id);

        if (error) return errorResponse("Failed to delete customer", 400);

        return successResponse({ id }, "Customer deleted");
    } catch (err: any) {
        return errorResponse("Failed to delete customer", 500);
    }
}
