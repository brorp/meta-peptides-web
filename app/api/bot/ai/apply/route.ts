import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readDiscordBotJson } from "@/lib/discord-bot-auth";
import { BOT_LEAD_SELECT, resolveLeadIdentifier } from "@/lib/discord-bot-data";
import { applyLatestSuggestion } from "@/lib/lead-chat-analysis";
import { supabaseAdmin } from "@/lib/supabase-server";

// !applyai <wa>: apply the newest suggestion the team has not applied yet.
export async function POST(req: NextRequest) {
  try {
    const auth = await readDiscordBotJson(req, { maxRequestsPerMinute: 30 });
    if (auth.response) return auth.response;
    const found = await resolveLeadIdentifier(String(auth.body?.wa ?? ""));
    if (!found.data) return errorResponse(found.error, 404);
    const { data: lead } = await supabaseAdmin.from("leads").select(BOT_LEAD_SELECT).eq("id", found.data.id).maybeSingle();
    if (!lead) return errorResponse("Lead tidak ditemukan", 404);

    const result = await applyLatestSuggestion(lead, auth.context!.username);
    if ("error" in result && result.error) return errorResponse(result.error, result.status);
    return successResponse(
      { lead: result.lead, changes: result.changes, summary: result.suggestion?.summary ?? null },
      result.changes?.length ? "Usulan AI diterapkan" : "Tidak ada yang berubah",
    );
  } catch {
    return errorResponse("Gagal menerapkan usulan AI", 500);
  }
}
