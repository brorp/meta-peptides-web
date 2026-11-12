import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { authenticateDiscordBotRequest, readDiscordBotJson } from "@/lib/discord-bot-auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { WHATSAPP_MIGRATION_MESSAGE, whatsappPhoneFrom } from "@/lib/whatsapp-listener-auth";

// !ignorewa: chats from this number never become leads (friends, family,
// suppliers). A lead that already exists is not changed.
export async function POST(req: NextRequest) {
  try {
    const auth = await readDiscordBotJson(req, { maxRequestsPerMinute: 30 });
    if (auth.response) return auth.response;
    const phone = whatsappPhoneFrom(auth.body?.wa);
    if (!phone) return errorResponse("Nomor WA tidak valid. Contoh: !ignorewa 081234567890", 400);
    const note = String(auth.body?.note ?? "").trim().slice(0, 200) || null;

    const { error } = await supabaseAdmin
      .from("whatsapp_ignored_numbers")
      .upsert({ phone, note, added_by: auth.context!.username }, { onConflict: "phone" });
    if (error) return errorResponse(WHATSAPP_MIGRATION_MESSAGE, 503);

    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("full_name, status, discord_username")
      .eq("whatsapp_phone", phone)
      .maybeSingle();
    return successResponse({ phone, note, lead }, "Nomor diabaikan");
  } catch {
    return errorResponse("Gagal menyimpan nomor yang diabaikan", 500);
  }
}

// !waignored: the 50 most recent ignored numbers.
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateDiscordBotRequest(req);
    if (auth.response) return auth.response;
    const { data, error, count } = await supabaseAdmin
      .from("whatsapp_ignored_numbers")
      .select("phone, note, added_by, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return errorResponse(WHATSAPP_MIGRATION_MESSAGE, 503);
    return successResponse({ items: data || [], total: count ?? (data || []).length }, "Daftar nomor yang diabaikan");
  } catch {
    return errorResponse("Gagal membaca daftar nomor yang diabaikan", 500);
  }
}
