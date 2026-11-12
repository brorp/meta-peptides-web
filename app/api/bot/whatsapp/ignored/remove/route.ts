import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readDiscordBotJson } from "@/lib/discord-bot-auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { WHATSAPP_MIGRATION_MESSAGE, whatsappPhoneFrom } from "@/lib/whatsapp-listener-auth";

// !unignorewa: chats from this number can become a lead again.
export async function POST(req: NextRequest) {
  try {
    const auth = await readDiscordBotJson(req, { maxRequestsPerMinute: 30 });
    if (auth.response) return auth.response;
    const phone = whatsappPhoneFrom(auth.body?.wa);
    if (!phone) return errorResponse("Nomor WA tidak valid. Contoh: !unignorewa 081234567890", 400);

    const { data, error } = await supabaseAdmin
      .from("whatsapp_ignored_numbers")
      .delete()
      .eq("phone", phone)
      .select("phone");
    if (error) {
      return errorResponse(WHATSAPP_MIGRATION_MESSAGE, 503);
    }
    return successResponse({ phone, removed: Boolean(data && data.length) }, "Nomor tidak diabaikan lagi");
  } catch {
    return errorResponse("Gagal menghapus nomor dari daftar abaikan", 500);
  }
}
