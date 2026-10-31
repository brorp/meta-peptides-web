import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { authenticateDiscordBotRequest } from "@/lib/discord-bot-auth";
import { addUtcDays, isDateWithin, parseDateRange } from "@/lib/discord-bot-data";
import {
  loadPaidCustomerOrders,
  summarizeCustomerOrder,
} from "@/lib/discord-bot-orders";

const AFTERSALES_WINDOWS = [
  { key: "h1", label: "H+1", days: 1 },
  { key: "h7", label: "H+7", days: 7 },
  { key: "h14", label: "H+14", days: 14 },
] as const;

// !aftersales <from> <to>: paid purchases due on H+1/H+7/H+14 after the order
// date, with the lead's context and what they bought.
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateDiscordBotRequest(req);
    if (auth.response) return auth.response;

    const range = parseDateRange(req, 92);
    if (range.error) return errorResponse(range.error, 400);

    const orders = await loadPaidCustomerOrders(
      addUtcDays(range.dateFrom, -14),
      addUtcDays(range.dateTo, -1),
    );

    const groups: Record<string, any[]> = Object.fromEntries(
      AFTERSALES_WINDOWS.map((window) => [window.key, []]),
    );
    for (const order of orders) {
      for (const window of AFTERSALES_WINDOWS) {
        const dueDate = addUtcDays(order.order_date, window.days);
        if (!isDateWithin(dueDate, range.dateFrom, range.dateTo)) continue;
        groups[window.key].push({
          ...summarizeCustomerOrder(order),
          aftersales_type: window.label,
          due_date: dueDate,
          items: order.order_items.map((item: any) => ({
            name: item.display_name,
            quantity: item.quantity,
          })),
        });
      }
    }

    for (const key of Object.keys(groups)) {
      groups[key].sort((left, right) => left.due_date.localeCompare(right.due_date));
    }

    return successResponse(
      { date_from: range.dateFrom, date_to: range.dateTo, groups },
      "Data aftersales",
    );
  } catch {
    return errorResponse("Gagal memuat data aftersales", 500);
  }
}
