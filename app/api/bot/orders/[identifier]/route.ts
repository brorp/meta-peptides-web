import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { authenticateDiscordBotRequest } from "@/lib/discord-bot-auth";
import { resolveOrderIdentifier } from "@/lib/discord-bot-data";
import { loadBotOrderDetail } from "@/lib/discord-bot-orders";

// !getinvoice <invoice>
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const auth = await authenticateDiscordBotRequest(req);
    if (auth.response) return auth.response;

    const { identifier } = await params;
    const orderResult = await resolveOrderIdentifier(decodeURIComponent(identifier));
    if (!orderResult.data) return errorResponse(orderResult.error, 404);

    const detail = await loadBotOrderDetail(orderResult.data.id);
    if (!detail.data) return errorResponse("Invoice tidak ditemukan", 404);

    return successResponse(detail.data, "Invoice ditemukan");
  } catch {
    return errorResponse("Gagal memuat invoice", 500);
  }
}
