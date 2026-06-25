import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
    getPendingCustomerTasks,
    isCustomerJourneyStage,
} from "@/lib/customer-sync";

export async function GET() {
    try {
        const auth = await requireAdminApiSession(["root"]);
        if (auth.response) return auth.response;

        const tasks = await getPendingCustomerTasks();
        return successResponse(
            {
                tasks,
                count: tasks.length,
            },
            "Daily tasks retrieved",
        );
    } catch (err: any) {
        return errorResponse("Failed to load daily tasks", 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdminApiSession(["root"]);
        if (auth.response) return auth.response;
        const role = auth.role;

        const body = await req.json();
        const customerId = String(body.customer_id || "").trim();
        const taskType = String(body.task_type || "").trim();
        const nextJourney = String(body.next_journey || "").trim();
        const evidenceUrl = String(body.evidence_url || "").trim();
        const notes = String(body.notes || "").trim();
        const orderId = String(body.order_id || "").trim();

        if (!customerId) return errorResponse("Customer is required", 400);
        if (!taskType) return errorResponse("Task type is required", 400);
        if (!isCustomerJourneyStage(nextJourney)) {
            return errorResponse("Next journey is invalid", 400);
        }
        if (!evidenceUrl) {
            return errorResponse("Screenshot evidence is required", 400);
        }
        if (nextJourney === "closing" && !orderId) {
            return errorResponse("Order is required when moving to Closing", 400);
        }

        const { data: customer, error: customerError } = await supabaseAdmin
            .from("customers")
            .select("id, full_name, username, whatsapp_phone, email, domicile, current_journey, first_order_id")
            .eq("id", customerId)
            .single();

        if (customerError || !customer) {
            return errorResponse("Customer not found", 404);
        }

        let closingAt: string | null = null;
        let linkedOrderId: string | null = null;

        if (nextJourney === "closing") {
            const { data: order, error: orderError } = await supabaseAdmin
                .from("orders")
                .select("id, created_at, shipping_name, shipping_phone, shipping_email, shipping_regional, customer_username")
                .eq("id", orderId)
                .single();

            if (orderError || !order) return errorResponse("Order not found", 404);

            closingAt = order.created_at;
            linkedOrderId = order.id;
        }

        const now = new Date().toISOString();
        const updateData: Record<string, any> = {
            current_journey: nextJourney,
            journey_updated_at: now,
            updated_at: now,
        };

        if (nextJourney === "closing") {
            updateData.closing_at = closingAt || now;
            updateData.last_order_id = linkedOrderId;
            updateData.first_order_id = customer.first_order_id || linkedOrderId;
        }

        const { data: updatedCustomer, error: updateError } = await supabaseAdmin
            .from("customers")
            .update(updateData)
            .eq("id", customerId)
            .select("id, full_name, username, whatsapp_phone, email, domicile, current_journey, first_order_id, last_order_id, journey_updated_at, updated_at")
            .single();

        if (updateError) return errorResponse("Failed to update daily task", 400);

        const { error: logError } = await supabaseAdmin
            .from("customer_journey_logs")
            .insert({
                customer_id: customerId,
                from_journey: customer.current_journey,
                to_journey: nextJourney,
                task_type: taskType,
                evidence_url: evidenceUrl,
                order_id: linkedOrderId,
                notes: notes || null,
                performed_by_role: role,
            });

        if (logError) return errorResponse("Failed to record daily task", 400);

        return successResponse(updatedCustomer, "Daily task completed");
    } catch (err: any) {
        return errorResponse("Failed to complete daily task", 500);
    }
}
