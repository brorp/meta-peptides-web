import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { authenticateDiscordBotRequest } from "@/lib/discord-bot-auth";
import {
  LEAD_ORIGINS,
  LEAD_STATUSES,
  getJakartaDate,
  parseDateOnly,
} from "@/lib/discord-bot-data";
import { fetchAllRows } from "@/lib/discord-bot-orders";
import { supabaseAdmin } from "@/lib/supabase-server";

const emptyStatusCounts = () =>
  Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0])) as Record<string, number>;

// !dailyreport [YYYY-MM-DD]: new leads (by chat_date) in total, per origin,
// and per origin x status.
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateDiscordBotRequest(req);
    if (auth.response) return auth.response;

    const requestedDate = new URL(req.url).searchParams.get("date");
    const date = requestedDate ? parseDateOnly(requestedDate) : getJakartaDate();
    if (!date) return errorResponse("Tanggal wajib format YYYY-MM-DD", 400);

    const leads = await fetchAllRows<any>((from, to) =>
      supabaseAdmin
        .from("leads")
        .select("id, origin, status, is_customer")
        .eq("chat_date", date)
        .order("id", { ascending: true })
        .range(from, to),
    );

    const byStatus = emptyStatusCounts();
    const byOrigin = Object.fromEntries(
      LEAD_ORIGINS.map((origin) => [origin, { total: 0, ...emptyStatusCounts() }]),
    ) as Record<string, Record<string, number>>;
    let converted = 0;

    for (const lead of leads) {
      if (lead.status in byStatus) byStatus[lead.status] += 1;
      const origin = byOrigin[lead.origin];
      if (origin) {
        origin.total += 1;
        if (lead.status in origin) origin[lead.status] += 1;
      }
      if (lead.is_customer) converted += 1;
    }

    return successResponse(
      {
        date,
        total: leads.length,
        converted,
        by_status: byStatus,
        by_origin: byOrigin,
      },
      "Daily report",
    );
  } catch {
    return errorResponse("Gagal memuat daily report", 500);
  }
}
