import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { authenticateDiscordBotRequest } from "@/lib/discord-bot-auth";
import {
  addUtcDays,
  isDateWithin,
  jakartaDayStart,
  parseDateRange,
} from "@/lib/discord-bot-data";
import {
  customerKey,
  fetchAllRows,
  loadPaidCustomerOrders,
  summarizeCustomerOrder,
} from "@/lib/discord-bot-orders";
import { supabaseAdmin } from "@/lib/supabase-server";

const SECOND_REMINDER_EXTRA_DAYS = 3;

async function getLongestUsageDays() {
  const [{ data: product }, { data: item }] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("usage_days")
      .order("usage_days", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("order_items")
      .select("usage_days_at_purchase")
      .not("usage_days_at_purchase", "is", null)
      .order("usage_days_at_purchase", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return Math.max(
    1,
    Number(product?.usage_days || 0),
    Number(item?.usage_days_at_purchase || 0),
  );
}

// !reorder / !reorderlast <from> <to>
// Each purchased product is due on order date + its usage life (+3 days for
// the last reminder). Misc products and products without a usage life are
// skipped, and so is a product the customer has already bought again.
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateDiscordBotRequest(req);
    if (auth.response) return auth.response;

    const range = parseDateRange(req, 92);
    if (range.error) return errorResponse(range.error, 400);

    const reminder = new URL(req.url).searchParams.get("reminder") || "first";
    if (!["first", "last"].includes(reminder)) {
      return errorResponse("reminder harus first atau last", 400);
    }
    const extraDays = reminder === "last" ? SECOND_REMINDER_EXTRA_DAYS : 0;
    const longestUsage = await getLongestUsageDays();

    const orders = await loadPaidCustomerOrders(
      addUtcDays(range.dateFrom, -(longestUsage + extraDays)),
      addUtcDays(range.dateTo, -(1 + extraDays)),
    );

    const candidates: any[] = [];
    for (const order of orders) {
      const dueItems = new Map<string, any[]>();
      for (const item of order.order_items) {
        if (item.effective_usage_days <= 0) continue;
        const dueDate = addUtcDays(order.order_date, item.effective_usage_days + extraDays);
        if (!isDateWithin(dueDate, range.dateFrom, range.dateTo)) continue;
        dueItems.set(dueDate, [...(dueItems.get(dueDate) || []), item]);
      }
      for (const [dueDate, items] of dueItems) {
        candidates.push({ order, dueDate, items });
      }
    }

    // Leave out products the customer already ordered again (any channel).
    let skippedRepurchases = 0;
    const reminders: any[] = [];
    if (candidates.length) {
      const time = (value: string) => new Date(value).getTime();
      const earliestOrderDate = candidates.reduce(
        (min, candidate) => (candidate.order.order_date < min ? candidate.order.order_date : min),
        candidates[0].order.order_date,
      );
      const laterOrders = await fetchAllRows<any>((from, to) =>
        supabaseAdmin
          .from("orders")
          .select("id, created_at, shipping_phone, status, order_items(product_id)")
          .neq("status", "cancelled")
          .gte("created_at", jakartaDayStart(earliestOrderDate))
          .order("created_at", { ascending: true })
          .range(from, to),
      );

      for (const candidate of candidates) {
        const key = customerKey(candidate.order);
        const purchasedAt = time(candidate.order.created_at);
        const remainingItems = candidate.items.filter((item: any) => {
          const repurchased = laterOrders.some(
            (later) =>
              later.id !== candidate.order.id &&
              time(later.created_at) > purchasedAt &&
              customerKey(later) === key &&
              (later.order_items || []).some(
                (laterItem: any) => laterItem.product_id === item.product_id,
              ),
          );
          if (repurchased) skippedRepurchases += 1;
          return !repurchased;
        });
        if (!remainingItems.length) continue;

        reminders.push({
          ...summarizeCustomerOrder(candidate.order),
          due_date: candidate.dueDate,
          reminder,
          items: remainingItems.map((item: any) => ({
            name: item.display_name,
            quantity: item.quantity,
            usage_days: item.effective_usage_days,
          })),
        });
      }
    }

    reminders.sort((left, right) => left.due_date.localeCompare(right.due_date));

    return successResponse(
      {
        date_from: range.dateFrom,
        date_to: range.dateTo,
        reminder,
        extra_days: extraDays,
        skipped_repurchases: skippedRepurchases,
        items: reminders,
      },
      "Data reorder",
    );
  } catch {
    return errorResponse("Gagal memuat data reorder", 500);
  }
}
