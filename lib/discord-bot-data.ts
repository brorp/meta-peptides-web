import { supabaseAdmin } from "@/lib/supabase-server";

export const LEAD_STATUSES = ["hot", "warm", "cold", "skip"] as const;
export const LEAD_ORIGINS = [
  "ads",
  "tokopedia",
  "instagram",
  "threads",
  "tiktok",
  "fnf",
  "shopee",
  "website",
] as const;
export const LEAD_REJECTIONS = [
  "harga",
  "company",
  "cara_penggunaan",
  "perizinan",
  "produk_tidak_ada",
  "ghosting",
] as const;
export const EXPENSE_PAID_BY = ["kas", "rudi", "rp"] as const;
export const BOT_PAYMENT_TYPES = [
  "Shopee",
  "Tokopedia",
  "QRIS",
  "Bank Transfer",
] as const;

// Orders from these sources are handled inside the marketplace, so they are
// left out of aftersales and reorder reminders.
export const MARKETPLACE_ORDER_SOURCES = ["shopee", "tokopedia"] as const;

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMPTY_VALUES = new Set(["", "-", "none", "null", "kosong", "tidak_ada"]);

export function isEmptyBotValue(value: unknown) {
  return EMPTY_VALUES.has(normalizeEnumValue(value));
}

export function normalizeBotPhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function normalizeEnumValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizePaymentType(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (normalized === "shopee") return "Shopee";
  if (normalized === "tokopedia" || normalized === "tokped") return "Tokopedia";
  if (normalized === "qris") return "QRIS";
  if (["banktransfer", "transfer", "tf", "bank"].includes(normalized)) {
    return "Bank Transfer";
  }

  return null;
}

export function parseDateOnly(value: unknown) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;

  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text
    ? null
    : text;
}

export function addUtcDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function isDateWithin(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

export function parseDateRange(req: Request, maxDays = 366) {
  const { searchParams } = new URL(req.url);
  const dateFrom = parseDateOnly(searchParams.get("date_from"));
  const dateTo = parseDateOnly(searchParams.get("date_to"));

  if (!dateFrom || !dateTo) {
    return { error: "Tanggal wajib format YYYY-MM-DD (contoh 2026-10-31)" } as const;
  }
  if (dateFrom > dateTo) {
    return { error: "Tanggal awal tidak boleh setelah tanggal akhir" } as const;
  }

  const duration = Math.round(
    (new Date(`${dateTo}T00:00:00.000Z`).getTime() -
      new Date(`${dateFrom}T00:00:00.000Z`).getTime()) /
      86_400_000,
  );
  if (duration > maxDays) {
    return { error: `Rentang tanggal maksimal ${maxDays} hari` } as const;
  }

  return { dateFrom, dateTo, error: null } as const;
}

export function getJakartaDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

// Start of a Jakarta calendar day as an ISO timestamp (for created_at filters).
export function jakartaDayStart(date: string) {
  return `${date}T00:00:00+07:00`;
}

export function jakartaDayEnd(date: string) {
  return `${date}T23:59:59.999+07:00`;
}

// Bot orders are paid when !payment ran. Orders created elsewhere (panel or
// website) have no payment step, so an accepted status counts as paid.
export function isOrderPaid(order: {
  is_paid?: boolean | null;
  lead_id?: string | null;
  manual_channel?: string | null;
  status?: string | null;
}) {
  if (order.status === "cancelled" || order.status === "reject") return false;
  if (order.is_paid) return true;
  const createdByBot = order.manual_channel === "discord" || Boolean(order.lead_id);
  return (
    !createdByBot &&
    ["processing", "shipping", "completed"].includes(String(order.status || ""))
  );
}

// Usage life for one purchased line. Uses the value captured at purchase;
// when none was captured (0/NULL), falls back to the product's current usage
// life so reminders start working once a director fills it in.
export function getEffectiveUsageDays(item: {
  usage_days_at_purchase?: number | null;
  products?: { usage_days?: number | null; product_type?: string | null } | null;
}) {
  const product = item.products || null;
  if (product?.product_type === "misc") return 0;

  const snapshot = Number(item.usage_days_at_purchase || 0);
  if (snapshot > 0) return snapshot;
  return Math.max(0, Number(product?.usage_days || 0));
}

const LEAD_COLUMNS =
  "id, whatsapp_phone, full_name, origin, status, interest_product_id, interest_text, rejection, chat_date, is_customer, notes, domicile, goal, customer_id, last_order_id, converted_at, discord_username, created_at, updated_at";

export const BOT_LEAD_SELECT = `${LEAD_COLUMNS}, product:products!leads_interest_product_id_fkey(id, name, label, volume, usage_days, product_type)`;

type Resolved<T> = { data: T; error: null } | { data: null; error: string };

export async function resolveLeadIdentifier(identifier: string): Promise<Resolved<Record<string, any>>> {
  const value = String(identifier || "").trim();
  if (!value) return { data: null, error: "Isi nomor WhatsApp atau ID lead" };

  let query = supabaseAdmin.from("leads").select(BOT_LEAD_SELECT);
  if (UUID_PATTERN.test(value)) {
    query = query.eq("id", value);
  } else {
    const phone = normalizeBotPhone(value);
    if (phone.length < 8) {
      return { data: null, error: `Nomor WhatsApp "${value}" tidak valid` };
    }
    query = query.eq("whatsapp_phone", phone);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { data: null, error: "Gagal memuat lead" };
  if (!data) {
    return {
      data: null,
      error: `Lead ${value} belum ada. Buat dulu dengan !newleads`,
    };
  }

  return { data: data as Record<string, any>, error: null };
}

const ORDER_LOOKUP_SELECT =
  "id, invoice_number, manual_reference, manual_channel, order_source, status, created_at, total_price, subtotal, voucher_discount_amount, shipping_name, shipping_phone, shipping_email, shipping_address, shipping_regional, shipping_zip, note, tracking_number, shipping_fee, shipment_type, is_paid, paid_at, lead_id";

export async function resolveOrderIdentifier(identifier: string): Promise<Resolved<Record<string, any>>> {
  let value = String(identifier || "").trim();
  if (!value) return { data: null, error: "Isi nomor invoice" };
  if (/^mw-/i.test(value)) value = value.toUpperCase();

  const baseQuery = () => supabaseAdmin.from("orders").select(ORDER_LOOKUP_SELECT);

  let data: any = null;
  let error: any = null;

  if (UUID_PATTERN.test(value)) {
    const result = await baseQuery().eq("id", value).maybeSingle();
    data = result.data;
    error = result.error;
  } else {
    const invoiceResult = await baseQuery().eq("invoice_number", value).maybeSingle();
    data = invoiceResult.data;
    error = invoiceResult.error;

    if (!data && !error) {
      const referenceResult = await baseQuery()
        .eq("manual_reference", value)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      data = referenceResult.data;
      error = referenceResult.error;
    }
  }

  if (error) return { data: null, error: "Gagal memuat invoice" };
  if (!data) return { data: null, error: `Invoice ${value} tidak ditemukan` };

  return { data, error: null };
}

// Turns the stock RPC error into a message the team can act on.
export function translateDatabaseError(message: unknown, fallback: string) {
  const text = String(message || "").trim();
  const stock = text.match(/^Insufficient stock for (.+)\. Available (-?\d+), needed (\d+)$/);
  if (stock) {
    return `Stok ${stock[1]} tidak cukup (tersedia ${stock[2]}, dibutuhkan ${stock[3]}). Cek stok di panel Inventory.`;
  }
  return text || fallback;
}
