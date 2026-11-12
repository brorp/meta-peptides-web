import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { UUID_PATTERN } from "@/lib/discord-bot-data";
import { analysisItem, analyzePendingLeads } from "@/lib/lead-chat-analysis";
import { readWhatsappListenerJson } from "@/lib/whatsapp-listener-auth";

// Several Claude calls per request.
export const maxDuration = 300;

// Called by the WhatsApp listener at 12.00 and 23.00 WIB, in batches until
// `more` is false: the ghosting rule (first batch only), then leads with new
// chat messages. `exclude` lists leads that failed in an earlier batch of the
// same run. The listener posts the result to Discord.
export async function POST(req: NextRequest) {
  try {
    const auth = await readWhatsappListenerJson(req);
    if (auth.response) return auth.response;
    const exclude = (Array.isArray(auth.body?.exclude) ? auth.body.exclude : [])
      .filter((id): id is string => typeof id === "string" && UUID_PATTERN.test(id))
      .slice(0, 100);
    const batch = await analyzePendingLeads({ ghosting: auth.body?.ghosting !== false, exclude });
    return successResponse(
      {
        configured: batch.configured,
        setup_error: "setup_error" in batch ? batch.setup_error : null,
        error: batch.error,
        more: batch.more,
        ghosted: batch.ghosted.map((row) => ({ whatsapp_phone: row.whatsapp_phone, full_name: row.full_name, previous_status: row.previous_status })),
        items: batch.items.map(analysisItem),
      },
      "Analisa chat selesai",
    );
  } catch {
    return errorResponse("Analisa chat gagal", 500);
  }
}
