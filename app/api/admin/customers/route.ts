import { NextRequest } from "next/server";
import { errorResponse, paginateResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
    isCustomerJourneyStage,
    normalizePhone,
    normalizeUsername,
    syncCustomersFromOrders,
} from "@/lib/customer-sync";
import { requireAdminApiSession } from "@/lib/admin-api";

const ADMIN_CUSTOMER_SELECT =
    "id, full_name, username, whatsapp_phone, email, domicile, lead_source, current_journey, notes, updated_at, last_order:orders!customers_last_order_id_fkey(id, total_price, order_source, manual_reference)";

const normalizeCustomerPayload = (body: any) => {
    const fullName = String(body.full_name || "").trim();
    const username = normalizeUsername(body.username);
    const whatsappPhone = normalizePhone(body.whatsapp_phone);
    const email = String(body.email || "").trim().toLowerCase();
    const currentJourney = isCustomerJourneyStage(body.current_journey)
        ? body.current_journey
        : "new_leads";

    if (!fullName) return { error: "Customer name is required" };
    if (!username && !whatsappPhone && !email) {
        return { error: "Username, WhatsApp number, or email is required" };
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: "Customer email is invalid" };
    }

    return {
        data: {
            full_name: fullName,
            username,
            whatsapp_phone: whatsappPhone,
            email: email || null,
            domicile: String(body.domicile || "").trim() || null,
            current_journey: currentJourney,
            lead_source: body.lead_source === "order" ? "order" : "manual",
            journey_updated_at: new Date().toISOString(),
            closing_at:
                currentJourney === "closing"
                    ? new Date().toISOString()
                    : body.closing_at || null,
            notes: String(body.notes || "").trim() || null,
        },
    };
};

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdminApiSession();
        if (auth.response) return auth.response;

        await syncCustomersFromOrders();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const keyword = searchParams.get("keyword") || "";
        const journey = searchParams.get("journey") || "";

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from("customers")
            .select(ADMIN_CUSTOMER_SELECT, {
                count: "exact",
            });

        if (keyword) {
            query = query.or(
                `full_name.ilike.%${keyword}%,username.ilike.%${keyword}%,whatsapp_phone.ilike.%${keyword}%,email.ilike.%${keyword}%`,
            );
        }

        if (isCustomerJourneyStage(journey)) {
            query = query.eq("current_journey", journey);
        }

        const { data, error, count } = await query
            .order("updated_at", { ascending: false })
            .range(from, to);

        if (error) return errorResponse("Failed to load customers", 400);

        return paginateResponse(
            data || [],
            page,
            limit,
            count || 0,
            "Customers retrieved",
        );
    } catch (err: any) {
        return errorResponse("Failed to load customers", 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdminApiSession();
        if (auth.response) return auth.response;

        const normalized = normalizeCustomerPayload(await req.json());
        if (normalized.error) return errorResponse(normalized.error, 400);

        const { data, error } = await supabaseAdmin
            .from("customers")
            .insert(normalized.data)
            .select(ADMIN_CUSTOMER_SELECT)
            .single();

        if (error) {
            if (error.code === "23505") {
                return errorResponse(
                    "Customer with the same username or WhatsApp number already exists",
                    409,
                );
            }
            return errorResponse("Failed to create customer", 400);
        }

        return successResponse(data, "Customer created", 201);
    } catch (err: any) {
        return errorResponse("Failed to create customer", 500);
    }
}
