import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readDiscordBotJson } from "@/lib/discord-bot-auth";
import { resolveLeadIdentifier } from "@/lib/discord-bot-data";
import { analysisItem, analysisSetupError, analyzeLead } from "@/lib/lead-chat-analysis";

export const maxDuration = 120;

// !analyze <wa>: analyse that lead's chat now, even without new messages.
export async function POST(req: NextRequest) {
  try {
    const auth = await readDiscordBotJson(req, { maxRequestsPerMinute: 10 });
    if (auth.response) return auth.response;
    const setupError = analysisSetupError();
    if (setupError) return errorResponse(setupError, 503);
    const lead = await resolveLeadIdentifier(String(auth.body?.wa ?? ""));
    if (!lead.data) return errorResponse(lead.error, 404);

    const outcome = await analyzeLead(lead.data.id, { force: true });
    if (outcome.result === "error") return errorResponse(outcome.error, outcome.fatal ? 503 : 502);
    return successResponse(analysisItem(outcome), "Chat dianalisa");
  } catch {
    return errorResponse("Gagal menganalisa chat", 500);
  }
}
