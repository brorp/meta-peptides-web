import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";
import { readWhatsappListenerJson } from "@/lib/whatsapp-listener-auth";

// Called by the WhatsApp listener once a day (around 03:00 WIB): chat text
// older than 90 days is removed (migration 20261111090000).
export async function POST(req: NextRequest) {
  try {
    const auth = await readWhatsappListenerJson(req);
    if (auth.response) return auth.response;

    const { data: deleted, error } = await supabaseAdmin.rpc("purge_old_whatsapp_messages", { p_days: 90 });
    return successResponse(
      {
        deleted: error ? null : Number(deleted || 0),
        purge_error: error ? "Gagal menghapus pesan WhatsApp lama" : null,
      },
      "Tugas harian selesai",
    );
  } catch {
    return errorResponse("Tugas harian WhatsApp listener gagal", 500);
  }
}
