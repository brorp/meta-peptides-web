import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { pendingWaContacts } from "@/lib/lead-wa-contacts";
import { readWhatsappListenerJson } from "@/lib/whatsapp-listener-auth";

// The WhatsApp listener asks which leads to save as WhatsApp contacts:
//   {}                 new leads and leads that changed (every 2 minutes);
//   { backfill: true } also older leads without a contact (!synccontacts);
//   { wa }             that lead now, whatever its status (!synccontacts <wa>).
export async function POST(req: NextRequest) {
  try {
    const auth = await readWhatsappListenerJson(req);
    if (auth.response) return auth.response;
    const body = auth.body || {};
    const wa = typeof body.wa === "string" ? body.wa.trim().slice(0, 40) : "";
    const outcome = await pendingWaContacts({ limit: Number(body.limit) || 10, backfill: body.backfill === true, wa: wa || null });
    if ("error" in outcome) return errorResponse(outcome.error, outcome.status);
    return successResponse(outcome, "Kontak yang perlu disimpan");
  } catch {
    return errorResponse("Gagal mengambil daftar kontak WhatsApp", 500);
  }
}
