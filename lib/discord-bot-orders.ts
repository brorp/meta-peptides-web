import { supabaseAdmin } from "@/lib/supabase-server";
import {
  MARKETPLACE_ORDER_SOURCES,
  addUtcDays,
  getEffectiveUsageDays,
  getJakartaDate,
  isOrderPaid,
  isReminderOrder,
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

// Lead details shown next to an order in !aftersales and !reorder.
const ORDER_LEAD_COLUMNS = "id, full_name, origin, status, rejection, notes, goal, discord_username";

const CUSTOMER_ORDER_SELECT = `id, invoice_number, manual_reference, manual_channel, order_source, status, created_at, paid_at, is_paid, total_price, lead_id, shipping_name, shipping_phone, shipping_regional, shipment_type, tracking_number, lead:leads!orders_lead_id_fkey(${ORDER_LEAD_COLUMNS}), order_items(id, product_id, quantity, usage_days_at_purchase, products(id, name, label, volume, usage_days, product_type))`;

export function customerKey(order: { id: string; shipping_phone?: string | null }) {
  const phone = normalizeBotPhone(order.shipping_phone);
  return phone ? `phone:${phone}` : `order:${order.id}`;
}

// The WhatsApp number of an order, normalized like leads.whatsapp_phone, or ""
// when it has fewer than 8 digits (Shopee/Tokopedia "-" or masked numbers).
// Same rule as public.normalize_wa_phone (migration 20261103100000).
export function orderWhatsapp(phone: unknown) {
  return String(phone || "").replace(/\D/g, "").length >= 8 ? normalizeBotPhone(phone) : "";
}

export function orderInvoiceLabel(order: {
  id: string;
  invoice_number?: string | null;
  manual_reference?: string | null;
}) {
  return order.invoice_number || order.manual_reference || order.id.slice(0, 8).toUpperCase();
}

const LEAD_LOOKUP_CHUNK = 100;

// Orders made in the panel or on the website have no lead_id. Attach the lead
// with the same WhatsApp number, so reminders show the lead's context. This is
// the same match the database uses to mark those leads as customers.
export async function attachLeadsByPhone<
  T extends { lead?: unknown; shipping_phone?: string | null },
>(orders: T[]) {
  const phones = [
    ...new Set(
      orders
        .filter((order) => !order.lead)
        .map((order) => orderWhatsapp(order.shipping_phone))
        .filter(Boolean),
    ),
  ];
  if (!phones.length) return orders;

  const leadsByPhone = new Map<string, any>();
  for (let start = 0; start < phones.length; start += LEAD_LOOKUP_CHUNK) {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select(`whatsapp_phone, ${ORDER_LEAD_COLUMNS}`)
      .in("whatsapp_phone", phones.slice(start, start + LEAD_LOOKUP_CHUNK));
    if (error) throw new Error(error.message || "Query failed");
    for (const lead of data || []) leadsByPhone.set(lead.whatsapp_phone, lead);
  }

  return orders.map((order) =>
    order.lead
      ? order
      : { ...order, lead: leadsByPhone.get(orderWhatsapp(order.shipping_phone)) || null },
  );
}

const LEAD_ORDER_SELECT =
  "id, invoice_number, manual_reference, manual_channel, order_source, created_at, total_price, is_paid, status, tracking_number, lead_id, shipping_phone";

// !lead: orders linked to the lead (!invoice) plus panel and website orders on
// the same WhatsApp number, newest first. Orders keep the number as it was
// typed (08…, +62…, or with invisible marks copied from WhatsApp), so the
// query narrows by the last four digits and the exact match happens here.
export async function loadLeadOrders(lead: { id: string; whatsapp_phone: string }, limit = 5) {
  const phone = orderWhatsapp(lead.whatsapp_phone);
  const filters = [`lead_id.eq.${lead.id}`];
  if (phone) filters.push(`shipping_phone.like.*${phone.slice(-4)}*`);

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(LEAD_ORDER_SELECT)
    .or(filters.join(","))
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message || "Query failed");

  return (data || [])
    .filter(
      (order: any) =>
        order.lead_id === lead.id || (phone && orderWhatsapp(order.shipping_phone) === phone),
    )
    .slice(0, limit)
    .map((order: any) => ({
      ...order,
      invoice_label: orderInvoiceLabel(order),
      paid: isOrderPaid(order),
      from_bot: order.manual_channel === "discord" || Boolean(order.lead_id),
    }));
}

// Paid orders whose Jakarta order date is within the range, with the lead of
// the same WhatsApp number when the order has no lead_id.
export async function loadPaidCustomerOrders(fromDate: string, toDate: string) {
  const orders = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from("orders")
      .select(CUSTOMER_ORDER_SELECT)
      .neq("status", "cancelled")
      // Shopee/Tokopedia orders without a lead (no WhatsApp number) are
      // skipped; ones linked to a lead stay. Same rule as isReminderOrder.
      .or(`order_source.not.in.(${MARKETPLACE_ORDER_SOURCES.join(",")}),lead_id.not.is.null`)
      .gte("created_at", jakartaDayStart(fromDate))
      .lte("created_at", jakartaDayEnd(toDate))
      .order("created_at", { ascending: true })
      .range(from, to),
  );

  const paidOrders = orders.filter(isOrderPaid).map((order) => ({
    ...order,
    order_date: getJakartaDate(new Date(order.created_at)),
    order_items: (order.order_items || []).map((item: any) => ({
      ...item,
      display_name: getProductDisplayName(item.products || {}),
      effective_usage_days: getEffectiveUsageDays(item),
    })),
  }));
  return attachLeadsByPhone(paidOrders);
}

export function summarizeCustomerOrder(order: any) {
  return {
    order_id: order.id,
    invoice_number: orderInvoiceLabel(order),
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
    reminders_enabled: isReminderOrder(order),
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
