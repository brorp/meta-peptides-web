import {
  BOT_LEAD_SELECT,
  LEAD_ORIGINS,
  LEAD_REJECTIONS,
  LEAD_STATUSES,
  type LeadOrigin,
  getJakartaDate,
  isEmptyBotValue,
  normalizeBotPhone,
  normalizeEnumValue,
  parseDateOnly,
} from "@/lib/discord-bot-data";
import { orderInvoiceLabel, orderWhatsapp } from "@/lib/discord-bot-orders";
import {
  ProductMatchError,
  getProductDisplayName,
  resolveProductQuery,
} from "@/lib/discord-bot-products";
import { supabaseAdmin } from "@/lib/supabase-server";

type LeadInput = Record<string, unknown>;

export class LeadInputError extends Error {}

const list = (values: readonly string[]) => values.join(", ");

// Shared validation for !newleads and !updateleads. Only keys present in the
// input are returned, so the same function works for partial updates.
export async function normalizeLeadInput(body: LeadInput, { partial }: { partial: boolean }) {
  const data: Record<string, unknown> = {};
  const has = (key: string) => body[key] !== undefined;

  if (has("wa") || has("whatsapp_phone") || !partial) {
    const phone = normalizeBotPhone(body.wa ?? body.whatsapp_phone);
    if (phone.length < 9 || phone.length > 16) {
      throw new LeadInputError("wa wajib diisi nomor WhatsApp yang valid (contoh 081234567890)");
    }
    data.whatsapp_phone = phone;
  }

  if (has("name") || has("full_name") || !partial) {
    const name = String(body.name ?? body.full_name ?? "").trim();
    if (!name || name.length > 160) {
      throw new LeadInputError("name wajib diisi (maksimal 160 karakter)");
    }
    data.full_name = name;
  }

  if (has("origin") || !partial) {
    const origin = normalizeEnumValue(body.origin);
    if (!LEAD_ORIGINS.includes(origin as (typeof LEAD_ORIGINS)[number])) {
      throw new LeadInputError(`origin wajib salah satu dari: ${list(LEAD_ORIGINS)}`);
    }
    data.origin = origin;
  }

  if (has("status") || !partial) {
    const status = normalizeEnumValue(body.status);
    if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
      throw new LeadInputError(`status wajib salah satu dari: ${list(LEAD_STATUSES)}`);
    }
    data.status = status;
  }

  if (has("rejection")) {
    const rejection = normalizeEnumValue(body.rejection);
    if (isEmptyBotValue(rejection)) {
      data.rejection = null;
    } else if (LEAD_REJECTIONS.includes(rejection as (typeof LEAD_REJECTIONS)[number])) {
      data.rejection = rejection;
    } else {
      throw new LeadInputError(
        `rejection harus salah satu dari: ${list(LEAD_REJECTIONS)} (atau - kalau kosong)`,
      );
    }
  }

  if (has("chat_date") && !isEmptyBotValue(body.chat_date)) {
    const chatDate = parseDateOnly(body.chat_date);
    if (!chatDate) throw new LeadInputError("chat_date wajib format YYYY-MM-DD (contoh 2026-10-31)");
    if (chatDate > getJakartaDate()) {
      throw new LeadInputError(`chat_date ${chatDate} tidak boleh lebih dari hari ini`);
    }
    data.chat_date = chatDate;
  }

  if (has("is_customer")) {
    if (typeof body.is_customer !== "boolean") {
      throw new LeadInputError("is_customer harus true atau false");
    }
    data.is_customer = body.is_customer;
  }

  for (const [key, max] of [
    ["notes", 4000],
    ["domicile", 160],
    ["goal", 500],
  ] as const) {
    if (!has(key)) continue;
    const value = String(body[key] ?? "").trim();
    if (value.length > max) throw new LeadInputError(`${key} maksimal ${max} karakter`);
    data[key] = isEmptyBotValue(value) ? null : value;
  }

  let interestWarning: string | null = null;
  let interestCandidates: string[] = [];

  if (has("interest")) {
    const interestText = String(body.interest ?? "").trim();
    if (isEmptyBotValue(interestText)) {
      data.interest_text = null;
      data.interest_product_id = null;
    } else {
      if (interestText.length > 200) {
        throw new LeadInputError("interest maksimal 200 karakter");
      }
      data.interest_text = interestText;
      // A lead's interest is often vague ("reta"), so an unclear match is
      // saved as text with a warning instead of rejecting the whole lead.
      try {
        const product = await resolveProductQuery(interestText);
        data.interest_product_id = product.id;
      } catch (error) {
        if (!(error instanceof ProductMatchError)) throw error;
        data.interest_product_id = null;
        interestWarning = `${error.message} Interest disimpan sebagai teks saja.`;
        interestCandidates = error.candidates;
      }
    }
  }

  return { data, interestWarning, interestCandidates };
}

export function formatLeadInterest(lead: any) {
  if (lead?.product) return getProductDisplayName(lead.product);
  return lead?.interest_text || null;
}

// --- Customers from before the bot -------------------------------------------
// Regular customers who ordered through the panel or the website before the
// Discord bot have no lead. !invoice makes their lead from that data instead
// of asking the team to run !newleads first.

const OLD_ORDER_SELECT =
  "id, invoice_number, manual_reference, manual_channel, order_source, status, created_at, shipping_name, shipping_phone, shipping_regional, lead_id";

type OldOrder = {
  id: string;
  invoice_number: string | null;
  manual_reference: string | null;
  manual_channel: string | null;
  order_source: string | null;
  status: string | null;
  created_at: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_regional: string | null;
  lead_id: string | null;
};

export type OldOrderSummary = {
  label: string;
  date: string;
  order_source: string | null;
  from_bot: boolean;
};

export type ExistingCustomer = {
  whatsapp_phone: string;
  customer_id: string | null;
  // customers.lead_source ("order" or "consultation"), null without a row.
  customer_source: string | null;
  full_name: string;
  domicile: string | null;
  origin: LeadOrigin;
  chat_date: string;
  order_count: number;
  first_order_date: string | null;
  last_order: OldOrderSummary | null;
  today_orders: OldOrderSummary[];
};

const clip = (value: unknown, max: number) => {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
};

function summarizeOldOrder(order: OldOrder): OldOrderSummary {
  return {
    label: orderInvoiceLabel(order),
    date: getJakartaDate(new Date(order.created_at)),
    order_source: order.order_source,
    from_bot: order.manual_channel === "discord" || Boolean(order.lead_id),
  };
}

// Where the customer came from, going by their first order. A WhatsApp order
// made in the panel does not tell, so that lead gets "existing".
function originFromOldData(firstOrder: OldOrder | undefined, customerSource: string | null): LeadOrigin {
  const source = firstOrder?.order_source;
  if (source === "shopee" || source === "tokopedia") return source;
  if (source === "checkout") return "website";
  if (!firstOrder && customerSource === "consultation") return "website";
  return "existing";
}

// A WhatsApp number without a lead that is already known: orders from the
// panel or website (cancelled and rejected ones do not count), or a row in the
// panel's customers table. Both keep the number as it was typed (08…, +62…, or
// with invisible marks copied from WhatsApp), so the query narrows by the last
// four digits and the exact match happens here, like loadLeadOrders.
// Returns null for a number never seen before.
export async function findExistingCustomer(phone: string): Promise<ExistingCustomer | null> {
  const last4 = phone.slice(-4);
  const [customersResult, ordersResult] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("id, full_name, whatsapp_phone, domicile, lead_source, created_at")
      .like("whatsapp_phone", `%${last4}%`)
      .limit(200),
    supabaseAdmin
      .from("orders")
      .select(OLD_ORDER_SELECT)
      .like("shipping_phone", `%${last4}%`)
      .order("created_at", { ascending: true })
      .limit(1000),
  ]);
  if (customersResult.error) throw new Error(customersResult.error.message || "Query failed");
  if (ordersResult.error) throw new Error(ordersResult.error.message || "Query failed");

  const customer = ((customersResult.data || []) as any[]).find(
    (row) => orderWhatsapp(row.whatsapp_phone) === phone,
  );
  const orders = ((ordersResult.data || []) as OldOrder[]).filter(
    (order) =>
      orderWhatsapp(order.shipping_phone) === phone &&
      order.status !== "cancelled" &&
      order.status !== "reject",
  );
  if (!customer && !orders.length) return null;

  const first = orders[0];
  const newest = orders[orders.length - 1];
  const today = getJakartaDate();
  const customerSource = clip(customer?.lead_source, 40);
  const customerName = clip(customer?.full_name, 160);
  const firstOrderDate = first ? summarizeOldOrder(first).date : null;
  const customerDate = customer?.created_at ? getJakartaDate(new Date(customer.created_at)) : null;
  // chat_date drives !followup and !dailyreport: the first order is the
  // closest known date of the first chat, so the lead does not count as a new
  // lead today.
  const chatDate = firstOrderDate || customerDate || today;

  return {
    whatsapp_phone: phone,
    customer_id: customer?.id || null,
    customer_source: customerSource,
    // The panel fills customers.full_name from the newest order; "Customer" is
    // its placeholder when an order had no name.
    full_name:
      (customerName && customerName.toLowerCase() !== "customer" ? customerName : null) ||
      clip(newest?.shipping_name, 160) ||
      `Customer ${last4}`,
    domicile: clip(customer?.domicile, 160) || clip(newest?.shipping_regional, 160),
    origin: originFromOldData(first, customerSource),
    chat_date: chatDate > today ? today : chatDate,
    order_count: orders.length,
    first_order_date: firstOrderDate,
    last_order: newest ? summarizeOldOrder(newest) : null,
    today_orders: orders.map(summarizeOldOrder).filter((order) => order.date === today),
  };
}

// "17 order sejak 2026-04-26, terakhir 2026-11-04", for bot messages.
export function describeExistingCustomer(existing: ExistingCustomer) {
  if (!existing.order_count) return "sudah ada di data customer panel";
  const last =
    existing.last_order && existing.last_order.date !== existing.first_order_date
      ? `, terakhir ${existing.last_order.date}`
      : "";
  return `sudah ${existing.order_count} order sejak ${existing.first_order_date}${last}`;
}

type CreatedLead =
  | { lead: Record<string, any>; created: boolean; error?: undefined }
  | { lead?: undefined; created?: undefined; error: string; status: number };

// Saves the lead for a customer found by findExistingCustomer. The person who
// ran the command becomes the PIC, like !newleads.
export async function createLeadFromExistingCustomer(
  existing: ExistingCustomer,
  context: { userId: string; username: string; messageId: string },
): Promise<CreatedLead> {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert({
      whatsapp_phone: existing.whatsapp_phone,
      full_name: existing.full_name,
      origin: existing.origin,
      // Ordering right now.
      status: "hot",
      chat_date: existing.chat_date,
      domicile: existing.domicile,
      customer_id: existing.customer_id,
      notes: existing.first_order_date
        ? `Dibuat otomatis oleh !invoice dari data customer lama (order pertama ${existing.first_order_date}).`
        : "Dibuat otomatis oleh !invoice dari data customer panel.",
      // Inserted as false like !newleads: the database marks the lead as a
      // customer when the number already has a paid order (migration
      // 20261103100000).
      is_customer: false,
      converted_at: null,
      discord_user_id: context.userId,
      discord_username: context.username,
      source_message_id: context.messageId,
    })
    .select(BOT_LEAD_SELECT)
    .single();

  if (!error && data) return { lead: data as Record<string, any>, created: true };

  if (error?.code === "23505") {
    // Another command saved this number a moment ago: use that lead.
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select(BOT_LEAD_SELECT)
      .eq("whatsapp_phone", existing.whatsapp_phone)
      .maybeSingle();
    if (lead) return { lead: lead as Record<string, any>, created: false };
  }

  // 22P02: the database does not know origin "existing" yet.
  if (error?.code === "22P02" && existing.origin === "existing") {
    return {
      error: `Nomor ${existing.whatsapp_phone} belum jadi lead, tapi ${describeExistingCustomer(existing)} (customer lama). Lead-nya belum bisa dibuat otomatis karena database belum di-update: jalankan migration 20261104100000_add_existing_lead_origin.sql di Supabase. Sementara ini buat dulu dengan !newleads.`,
      status: 503,
    };
  }

  return {
    error: `Gagal membuat lead otomatis untuk nomor ${existing.whatsapp_phone} dari data customer lama. Buat dulu dengan !newleads.`,
    status: 500,
  };
}
