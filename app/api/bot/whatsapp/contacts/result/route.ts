import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { UUID_PATTERN } from "@/lib/discord-bot-data";
import { recordWaContactResults, type WaContactResult } from "@/lib/lead-wa-contacts";
import { readWhatsappListenerJson } from "@/lib/whatsapp-listener-auth";

// The WhatsApp listener reports which contacts it saved (or why not).
export async function POST(req: NextRequest) {
  try {
    const auth = await readWhatsappListenerJson(req);
    if (auth.response) return auth.response;
    const body = auth.body || {};
    const asOf = Date.parse(String(body.as_of || ""));
    // as_of comes from pending: not in the future, at most a day old.
    if (!Number.isFinite(asOf) || asOf > Date.now() + 60_000 || asOf < Date.now() - 864e5) {
      return errorResponse("as_of tidak valid", 400);
    }
    const results = (Array.isArray(body.results) ? body.results : [])
      .filter((row): row is WaContactResult => Boolean(row) && typeof row === "object" && UUID_PATTERN.test(String((row as WaContactResult).lead_id)))
      .slice(0, 50)
      .map((row) => ({ lead_id: row.lead_id, ok: row.ok === true, name: String(row.name ?? ""), phone: String(row.phone ?? ""), error: String(row.error ?? "") }));
    const outcome = await recordWaContactResults(results, new Date(asOf).toISOString());
    if (outcome.error) return errorResponse(outcome.error, 503);
    return successResponse({ saved: outcome.saved }, "Hasil kontak disimpan");
  } catch {
    return errorResponse("Gagal menyimpan hasil kontak WhatsApp", 500);
  }
}
