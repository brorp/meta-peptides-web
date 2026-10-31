import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readDiscordBotJson } from "@/lib/discord-bot-auth";
import { BOT_LEAD_SELECT, getJakartaDate } from "@/lib/discord-bot-data";
import { LeadInputError, normalizeLeadInput } from "@/lib/discord-bot-leads";
import { supabaseAdmin } from "@/lib/supabase-server";

// Fields accepted when a lead is created. domicile, goal, and notes are only
// set through !updateleads; is_customer always starts false.
const NEW_LEAD_KEYS = ["wa", "whatsapp_phone", "name", "full_name", "origin", "status", "interest", "rejection", "chat_date"];

// !newleads
export async function POST(req: NextRequest) {
  try {
    const auth = await readDiscordBotJson(req, { maxRequestsPerMinute: 30 });
    if (auth.response) return auth.response;
    const context = auth.context!;

    // The bot may retry the same Discord message; return the lead it created.
    const { data: replay } = await supabaseAdmin
      .from("leads")
      .select(BOT_LEAD_SELECT)
      .eq("source_message_id", context.messageId)
      .maybeSingle();
    if (replay) return successResponse({ lead: replay }, "Lead sudah dibuat");

    const body = auth.body || {};
    const input = Object.fromEntries(
      Object.entries(body).filter(([key]) => NEW_LEAD_KEYS.includes(key)),
    );
    const { data, interestWarning, interestCandidates } = await normalizeLeadInput(
      input,
      { partial: false },
    );

    const { data: existing } = await supabaseAdmin
      .from("leads")
      .select("id, full_name, status, is_customer")
      .eq("whatsapp_phone", data.whatsapp_phone as string)
      .maybeSingle();
    if (existing) {
      return errorResponse(
        `Nomor ${data.whatsapp_phone} sudah terdaftar sebagai lead "${existing.full_name}" (status ${existing.status}${existing.is_customer ? ", sudah customer" : ""}). Pakai !updateleads ${data.whatsapp_phone} untuk mengubah datanya.`,
        409,
      );
    }

    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .insert({
        ...data,
        // Defaults to the day the lead is entered (Jakarta time).
        chat_date: (data.chat_date as string | undefined) || getJakartaDate(),
        is_customer: false,
        converted_at: null,
        discord_user_id: context.userId,
        discord_username: context.username,
        source_message_id: context.messageId,
      })
      .select(BOT_LEAD_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") {
        return errorResponse(
          `Nomor ${data.whatsapp_phone} sudah terdaftar. Pakai !updateleads.`,
          409,
        );
      }
      return errorResponse("Gagal menyimpan lead", 400);
    }

    return successResponse(
      {
        lead,
        interest_warning: interestWarning,
        interest_candidates: interestCandidates,
      },
      "Lead dibuat",
      201,
    );
  } catch (error) {
    if (error instanceof LeadInputError) return errorResponse(error.message, 400);
    return errorResponse("Gagal menyimpan lead", 500);
  }
}
