import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readWhatsappListenerJson } from "@/lib/whatsapp-listener-auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { KpiError, runKpiScan } from "@/lib/cs-kpi";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await readWhatsappListenerJson(req);
  if (auth.response) return auth.response;
  if (typeof auth.body?.connected !== "boolean")
    return errorResponse("Status listener tidak valid.", 400);
  try {
    const heartbeat = await supabaseAdmin.rpc("cs_kpi_heartbeat", {
      p_connected: auth.body.connected,
    });
    if (heartbeat.error)
      return errorResponse("Migration supervisi CS belum siap.", 503);
    const result = await runKpiScan();
    // The listener only needs job health. Findings/scores never leave the
    // director panel and are not posted to a staff Discord/WhatsApp channel.
    return successResponse(
      { status: result.status },
      "Pemeriksaan supervisi selesai",
    );
  } catch (error) {
    return errorResponse(
      error instanceof KpiError
        ? error.message
        : "Pemeriksaan supervisi gagal.",
      error instanceof KpiError ? error.status : 500,
    );
  }
}
