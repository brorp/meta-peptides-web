import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api";
import {
  ADMIN_LEAD_SELECT,
  applyLeadFilters,
  buildLeadSummary,
  decorateAdminLead,
  normalizeAdminLeadInput,
  parseAdminLeadFilters,
} from "@/lib/admin-leads";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getJakartaDate } from "@/lib/discord-bot-data";
import { LeadInputError } from "@/lib/discord-bot-leads";
import { fetchAllRows } from "@/lib/discord-bot-orders";
import { supabaseAdmin } from "@/lib/supabase-server";

// Panel Leads page: paged list plus summary counts for the same filters.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const parsed = parseAdminLeadFilters(searchParams);
    if (!parsed.filters) return errorResponse(parsed.error, 400);
    const { filters } = parsed;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const from = (page - 1) * limit;

    const [listResult, summaryRows] = await Promise.all([
      applyLeadFilters(
        supabaseAdmin.from("leads").select(ADMIN_LEAD_SELECT, { count: "exact" }),
        filters,
      )
        .order("chat_date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + limit - 1),
      fetchAllRows<any>((rangeFrom, rangeTo) =>
        applyLeadFilters(
          supabaseAdmin.from("leads").select("status, origin, rejection, is_customer"),
          filters,
          { includeStatus: false },
        )
          .order("id", { ascending: true })
          .range(rangeFrom, rangeTo),
      ),
    ]);

    let rows = listResult.data || [];
    let count = listResult.count || 0;

    if (listResult.error) {
      // PGRST103: the page is past the last row (for example after a delete).
      if (listResult.error.code !== "PGRST103") {
        return errorResponse("Failed to load leads", 400);
      }
      const head = await applyLeadFilters(
        supabaseAdmin.from("leads").select("id", { count: "exact", head: true }),
        filters,
      );
      if (head.error) return errorResponse("Failed to load leads", 400);
      rows = [];
      count = head.count || 0;
    }

    const totalPages = Math.ceil(count / limit);

    return NextResponse.json({
      success: true,
      message: "Leads retrieved",
      data: rows.map((lead: any) => decorateAdminLead(lead, filters.today)),
      pagination: {
        total_items: count,
        total_pages: totalPages,
        current_page: page,
        limit,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
      summary: buildLeadSummary(summaryRows),
      today: filters.today,
    });
  } catch {
    return errorResponse("Failed to load leads", 500);
  }
}

// Add a lead from the panel. Same fields and rules as !newleads.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("Invalid request body", 400);
    }

    const data = await normalizeAdminLeadInput(body, { partial: false });
    const today = getJakartaDate();

    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .insert({
        ...data,
        chat_date: (data.chat_date as string | undefined) || today,
        is_customer: false,
        converted_at: null,
      })
      .select(ADMIN_LEAD_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await supabaseAdmin
          .from("leads")
          .select("full_name")
          .eq("whatsapp_phone", data.whatsapp_phone as string)
          .maybeSingle();
        return errorResponse(
          existing
            ? `This WhatsApp number already belongs to lead "${existing.full_name}"`
            : "A lead with this WhatsApp number already exists",
          409,
        );
      }
      return errorResponse("Failed to create lead", 400);
    }

    return successResponse(decorateAdminLead(lead, today), "Lead created", 201);
  } catch (error) {
    if (error instanceof LeadInputError) return errorResponse(error.message, 400);
    return errorResponse("Failed to create lead", 500);
  }
}
