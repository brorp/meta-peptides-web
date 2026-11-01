import { NextRequest } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api";
import {
  ADMIN_LEAD_SELECT,
  decorateAdminLead,
  normalizeAdminLeadInput,
} from "@/lib/admin-leads";
import { errorResponse, successResponse } from "@/lib/api-response";
import { UUID_PATTERN, getJakartaDate } from "@/lib/discord-bot-data";
import { LeadInputError } from "@/lib/discord-bot-leads";
import { supabaseAdmin } from "@/lib/supabase-server";

type RouteParams = { params: Promise<{ id: string }> };

// Edit a lead from the panel. Only the fields sent are changed (like !updateleads).
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return errorResponse("Lead not found", 404);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("Invalid request body", 400);
    }

    const { data: current, error: loadError } = await supabaseAdmin
      .from("leads")
      .select("id, converted_at")
      .eq("id", id)
      .maybeSingle();
    if (loadError) return errorResponse("Failed to load lead", 400);
    if (!current) return errorResponse("Lead not found", 404);

    const data = await normalizeAdminLeadInput(body, { partial: true });
    if (!Object.keys(data).length) return errorResponse("Nothing to update", 400);

    if (data.is_customer !== undefined) {
      data.converted_at = data.is_customer
        ? current.converted_at || new Date().toISOString()
        : null;
    }

    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(ADMIN_LEAD_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") {
        return errorResponse("Another lead already uses this WhatsApp number", 409);
      }
      return errorResponse("Failed to update lead", 400);
    }

    return successResponse(decorateAdminLead(lead, getJakartaDate()), "Lead updated");
  } catch (error) {
    if (error instanceof LeadInputError) return errorResponse(error.message, 400);
    return errorResponse("Failed to update lead", 500);
  }
}

// Root only. Orders and the customer record stay; orders.lead_id becomes NULL.
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdminApiSession(["root"]);
    if (auth.response) return auth.response;

    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return errorResponse("Lead not found", 404);

    const { data, error } = await supabaseAdmin
      .from("leads")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) return errorResponse("Failed to delete lead", 400);
    if (!data?.length) return errorResponse("Lead not found", 404);

    return successResponse({ id }, "Lead deleted");
  } catch {
    return errorResponse("Failed to delete lead", 500);
  }
}
