import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { authenticateDiscordBotRequest } from "@/lib/discord-bot-auth";
import {
  BOT_LEAD_SELECT,
  LEAD_FOLLOWUP_WINDOWS as FOLLOWUP_WINDOWS,
  LEAD_STATUSES,
  addUtcDays,
  isDateWithin,
  parseDateRange,
} from "@/lib/discord-bot-data";
import { fetchAllRows } from "@/lib/discord-bot-orders";
import { supabaseAdmin } from "@/lib/supabase-server";

const statusRank = (status: string) => {
  const index = LEAD_STATUSES.indexOf(status as (typeof LEAD_STATUSES)[number]);
  return index === -1 ? LEAD_STATUSES.length : index;
};

// !followup <from> <to>: leads due on H+1/H+3/H+7 after chat_date.
// Leads that already bought (is_customer = true) are excluded; they belong in
// !aftersales. The database sets is_customer once an order on the lead's
// WhatsApp number is paid, from any source (migration 20261103100000).
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateDiscordBotRequest(req);
    if (auth.response) return auth.response;

    const range = parseDateRange(req, 92);
    if (range.error) return errorResponse(range.error, 400);

    const leads = await fetchAllRows<any>((from, to) =>
      supabaseAdmin
        .from("leads")
        .select(BOT_LEAD_SELECT)
        .eq("is_customer", false)
        .gte("chat_date", addUtcDays(range.dateFrom, -7))
        .lte("chat_date", addUtcDays(range.dateTo, -1))
        .order("chat_date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    );

    const groups: Record<string, any[]> = Object.fromEntries(
      FOLLOWUP_WINDOWS.map((window) => [window.key, []]),
    );
    for (const lead of leads) {
      for (const window of FOLLOWUP_WINDOWS) {
        const dueDate = addUtcDays(lead.chat_date, window.days);
        if (isDateWithin(dueDate, range.dateFrom, range.dateTo)) {
          groups[window.key].push({ ...lead, followup_type: window.label, due_date: dueDate });
        }
      }
    }

    // Hot leads first, then by due date.
    for (const key of Object.keys(groups)) {
      groups[key].sort(
        (left, right) =>
          statusRank(left.status) - statusRank(right.status) ||
          left.due_date.localeCompare(right.due_date),
      );
    }

    return successResponse(
      { date_from: range.dateFrom, date_to: range.dateTo, groups },
      "Data follow up",
    );
  } catch {
    return errorResponse("Gagal memuat data follow up", 500);
  }
}
