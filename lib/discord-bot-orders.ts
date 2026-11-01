import { supabaseAdmin } from "@/lib/supabase-server";
import {
  MARKETPLACE_ORDER_SOURCES,
  addUtcDays,
  getEffectiveUsageDays,
  getJakartaDate,
  isOrderPaid,
  jakartaDayEnd,
  jakartaDayStart,
  normalizeBotPhone,
} from "@/lib/discord-bot-data";
import { getProductDisplayName } from "@/lib/discord-bot-product-match";

const PAGE_SIZE = 1000;

// PostgREST caps each response (1000 rows by default), so read in pages.
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  maxRows = 20_000,
) {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message || "Query failed");
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

const CUSTOMER_ORDER_SELECT =
  "id, invoice_number, manual_reference, manual_channel, order_source, status, created_at, paid_at, is_paid, total_price, lead_id, shipping_name, shipping_phone, shipping_regional, shipment_type, tracking_number, lead:leads!orders_lead_id_fkey(id, full_name, origin, status, rejection, notes, goal, discord_username), order_items(id, product_id, quantity, usage_days_at_purchase, products(id, name, label, volume, usage_days, product_type))";

export function customerKey(order: { id: string; shipping_phone?: string | null }) {
  const phone = normalizeBotPhone(order.shipping_phone);
  return phone ? `phone:${phone}` : `order:${order.id}`;
}

// Paid, non-marketplace orders whose Jakarta order date is within the range.
export async function loadPaidCustomerOrders(fromDate: string, toDate: string) {
  const orders = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from("orders")
      .select(CUSTOMER_ORDER_SELECT)
      .neq("status", "cancelled")
      // Panel-made Shopee/Tokopedia orders are skipped; bot orders (with a lead) stay.
      .or(`order_source.not.in.(${MARKETPLACE_ORDER_SOURCES.join(",")}),lead_id.not.is.null`)
      .gte("created_at", jakartaDayStart(fromDate))
      .lte("created_at", jakartaDayEnd(toDate))
      .order("created_at", { ascending: true })
      .range(from, to),
  );

  return orders.filter(isOrderPaid).map((order) => ({
    ...order,
    order_date: getJakartaDate(new Date(order.created_at)),
    order_items: (order.order_items || []).map((item: any) => ({
      ...item,
      display_name: getProductDisplayName(item.products || {}),
      effective_usage_days: getEffectiveUsageDays(item),
    })),
  }));
}

export function summarizeCustomerOrder(order: any) {
  return {
    order_id: order.id,
    invoice_number: order.invoice_number || order.manual_reference || order.id.slice(0, 8).toUpperCase(),
    order_date: order.order_date,
    order_source: order.order_source,
    customer: {
      name: order.shipping_name,
      phone: order.shipping_phone,
      city: order.shipping_regional,
    },
    shipment_type: order.shipment_type,
    tracking_number: order.tracking_number,
    lead: order.lead
      ? {
          status: order.lead.status,
          origin: order.lead.origin,
          rejection: order.lead.rejection,
          notes: order.lead.notes,
          goal: order.lead.goal,
          pic: order.lead.discord_username,
        }
      : null,
  };
}

export const BOT_ORDER_DETAIL_SELECT =
  "id, invoice_number, manual_reference, manual_channel, status, created_at, total_price, subtotal, voucher_code, voucher_discount_amount, marketplace_fee, shipping_name, shipping_phone, shipping_email, shipping_address, shipping_regional, shipping_zip, customer_username, note, tracking_number, order_source, shipping_fee, shipment_type, is_paid, paid_at, lead_id, lead:leads!orders_lead_id_fkey(id, full_name, whatsapp_phone, origin, status, rejection, notes, domicile, goal), order_items(id, product_id, quantity, price_at_purchase, usage_days_at_purchase, products(id, name, label, volume, image_url, slug, usage_days, product_type)), payments(id, transaction_code, payment_type, status, receipt_url, is_paid, payment_amount, payment_date, created_at)";

// Adds display names and reorder dates so the bot does not repeat this logic.
export function decorateBotOrder(order: any) {
  if (!order) return order;

  const orderDate = getJakartaDate(new Date(order.created_at));
  const payments = [...(order.payments || [])].sort(
    (left: any, right: any) =>
      new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime(),
  );

  return {
    ...order,
    order_date: orderDate,
    payments,
    payment: payments[0] || null,
    order_items: (order.order_items || []).map((item: any) => {
      const usageDays = getEffectiveUsageDays(item);
      const isMisc = item.products?.product_type === "misc";
      return {
        ...item,
        display_name: getProductDisplayName(item.products || {}),
        effective_usage_days: usageDays,
        reorder_date: usageDays > 0 ? addUtcDays(orderDate, usageDays) : null,
        missing_usage_life: !isMisc && usageDays === 0,
      };
    }),
  };
}

export async function loadBotOrderDetail(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(BOT_ORDER_DETAIL_SELECT)
    .eq("id", orderId)
    .single();

  if (error || !data) return { data: null, error: error?.message || "Invoice tidak ditemukan" };
  return { data: decorateBotOrder(data), error: null };
}
