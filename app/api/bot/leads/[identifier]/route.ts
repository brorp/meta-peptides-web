import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  authenticateDiscordBotRequest,
  readDiscordBotJson,
} from "@/lib/discord-bot-auth";
import { BOT_LEAD_SELECT, resolveLeadIdentifier } from "@/lib/discord-bot-data";
import { LeadInputError, normalizeLeadInput } from "@/lib/discord-bot-leads";
import { loadLeadOrders } from "@/lib/discord-bot-orders";
import { supabaseAdmin } from "@/lib/supabase-server";

type RouteParams = { params: Promise<{ identifier: string }> };

// !lead <wa|id>
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateDiscordBotRequest(req);
    if (auth.response) return auth.response;

    const { identifier } = await params;
    const leadResult = await resolveLeadIdentifier(decodeURIComponent(identifier));
    if (!leadResult.data) return errorResponse(leadResult.error, 404);

    // !invoice orders plus panel/website orders on the same WhatsApp number.
    const orders = await loadLeadOrders(
      leadResult.data as { id: string; whatsapp_phone: string },
    );

    return successResponse({ lead: leadResult.data, orders }, "Lead ditemukan");
  } catch {
    return errorResponse("Gagal memuat lead", 500);
  }
}

// !updateleads <wa|id>
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await readDiscordBotJson(req, { maxRequestsPerMinute: 30 });
    if (auth.response) return auth.response;

    const { identifier } = await params;
    const leadResult = await resolveLeadIdentifier(decodeURIComponent(identifier));
    if (!leadResult.data) return errorResponse(leadResult.error, 404);

    const { data, interestWarning, interestCandidates } = await normalizeLeadInput(
      auth.body || {},
      { partial: true },
    );
    if (!Object.keys(data).length) {
      return errorResponse(
        "Tidak ada field yang diubah. Tulis field di baris baru, contoh: status: warm",
        400,
      );
    }

    if (data.is_customer !== undefined) {
      data.converted_at = data.is_customer
        ? leadResult.data.converted_at || new Date().toISOString()
        : null;
    }

    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadResult.data.id)
      .select(BOT_LEAD_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") {
        return errorResponse("Nomor WhatsApp baru sudah dipakai lead lain", 409);
      }
      return errorResponse("Gagal mengubah lead", 400);
    }

    return successResponse(
      {
        lead,
        changed_fields: Object.keys(data).filter((key) => key !== "converted_at"),
        interest_warning: interestWarning,
        interest_candidates: interestCandidates,
      },
      "Lead diubah",
    );
  } catch (error) {
    if (error instanceof LeadInputError) return errorResponse(error.message, 400);
    return errorResponse("Gagal mengubah lead", 500);
  }
}
