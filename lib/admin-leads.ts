import {
  LEAD_FOLLOWUP_WINDOWS,
  LEAD_ORIGINS,
  LEAD_REJECTIONS,
  LEAD_STATUSES,
  UUID_PATTERN,
  addUtcDays,
  getJakartaDate,
  parseDateOnly,
} from "@/lib/discord-bot-data";
import { LeadInputError, normalizeLeadInput } from "@/lib/discord-bot-leads";
import { getProductDisplayName } from "@/lib/discord-bot-products";
import { supabaseAdmin } from "@/lib/supabase-server";

// Helpers for the panel Leads page (/api/admin/leads). Leads are the same rows
// the Discord bot writes with !newleads and !updateleads.

export const ADMIN_LEAD_SELECT =
  "id, whatsapp_phone, full_name, origin, status, interest_product_id, interest_text, rejection, chat_date, is_customer, notes, domicile, goal, customer_id, last_order_id, converted_at, discord_username, created_at, updated_at, product:products!leads_interest_product_id_fkey(id, name, label, volume), last_order:orders!leads_last_order_id_fkey(id, invoice_number, manual_reference, total_price, created_at)";

export const LEAD_VIEWS = ["prospect", "customer", "followup_today"] as const;

// Same fields as !newleads. Domicile, goal, notes and is_customer are only
// set after the lead exists, like !updateleads.
const CREATE_KEYS = ["whatsapp_phone", "full_name", "origin", "status", "rejection", "chat_date"];
const UPDATE_KEYS = [...CREATE_KEYS, "domicile", "goal", "notes", "is_customer"];

export type AdminLeadFilters = {
  keyword: string;
  status: string;
  origin: string;
  rejection: string;
  view: string;
  dateFrom: string | null;
  dateTo: string | null;
  today: string;
};

export function parseAdminLeadFilters(searchParams: URLSearchParams) {
  const pick = (key: string, allowed: readonly string[]) => {
    const value = searchParams.get(key) || "";
    return allowed.includes(value) ? value : "";
  };

  const rawFrom = (searchParams.get("date_from") || "").trim();
  const rawTo = (searchParams.get("date_to") || "").trim();
  // A single date means that day only, the same rule as the bot's date ranges.
  const fromText = rawFrom || rawTo;
  const toText = rawTo || rawFrom;
  const dateFrom = fromText ? parseDateOnly(fromText) : null;
  const dateTo = toText ? parseDateOnly(toText) : null;

  if ((fromText && !dateFrom) || (toText && !dateTo)) {
    return { filters: null, error: "Dates must use the YYYY-MM-DD format" } as const;
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return { filters: null, error: "The start date must be on or before the end date" } as const;
  }

  const filters: AdminLeadFilters = {
    keyword: (searchParams.get("keyword") || "").trim().slice(0, 100),
    status: pick("status", LEAD_STATUSES),
    origin: pick("origin", LEAD_ORIGINS),
    rejection: pick("rejection", LEAD_REJECTIONS),
    view: pick("view", LEAD_VIEWS),
    dateFrom,
    dateTo,
    today: getJakartaDate(),
  };

  return { filters, error: null } as const;
}

// Applies the page filters to a leads query. The summary cards skip the
// status filter so every status count stays visible while one is selected.
export function applyLeadFilters(
  query: any,
  filters: AdminLeadFilters,
  { includeStatus = true }: { includeStatus?: boolean } = {},
) {
  let next = query;

  if (includeStatus && filters.status) next = next.eq("status", filters.status);
  if (filters.origin) next = next.eq("origin", filters.origin);
  if (filters.rejection) next = next.eq("rejection", filters.rejection);
  if (filters.view === "prospect") next = next.eq("is_customer", false);
  if (filters.view === "customer") next = next.eq("is_customer", true);
  if (filters.view === "followup_today") {
    next = next
      .eq("is_customer", false)
      .in(
        "chat_date",
        LEAD_FOLLOWUP_WINDOWS.map((window) => addUtcDays(filters.today, -window.days)),
      );
  }
  if (filters.dateFrom) next = next.gte("chat_date", filters.dateFrom);
  if (filters.dateTo) next = next.lte("chat_date", filters.dateTo);

  // Commas, quotes and parentheses would change the PostgREST filter itself.
  const keyword = filters.keyword.replace(/[,()"\\]/g, " ").trim();
  if (keyword) {
    const digits = keyword.replace(/[\s+.-]/g, "");
    if (/^\d{3,}$/.test(digits)) {
      // Numbers are stored as 62..., so "0812" searches for "62812".
      const phone = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
      next = next.ilike("whatsapp_phone", `%${phone}%`);
    } else {
      next = next.or(
        ["full_name", "interest_text", "notes", "domicile", "goal"]
          .map((column) => `${column}.ilike.%${keyword}%`)
          .join(","),
      );
    }
  }

  return next;
}

type SummaryRow = {
  status: string;
  origin: string;
  rejection: string | null;
  is_customer: boolean;
};

export function buildLeadSummary(rows: SummaryRow[]) {
  const count = (keys: readonly string[]) =>
    Object.fromEntries(keys.map((key) => [key, 0])) as Record<string, number>;

  const byStatus = count(LEAD_STATUSES);
  const byOrigin = count(LEAD_ORIGINS);
  const byRejection = count(LEAD_REJECTIONS);
  let converted = 0;

  for (const row of rows) {
    if (row.status in byStatus) byStatus[row.status] += 1;
    if (row.origin in byOrigin) byOrigin[row.origin] += 1;
    if (row.rejection && row.rejection in byRejection) byRejection[row.rejection] += 1;
    if (row.is_customer) converted += 1;
  }

  return {
    total: rows.length,
    converted,
    by_status: byStatus,
    by_origin: byOrigin,
    by_rejection: byRejection,
  };
}

// Next follow-up (H+1, H+3, H+7 after chat_date) that is today or later.
export function getLeadFollowup(chatDate: string, today: string) {
  for (const window of LEAD_FOLLOWUP_WINDOWS) {
    const date = addUtcDays(chatDate, window.days);
    if (date >= today) return { label: window.label, date, due_today: date === today };
  }
  return null;
}

export function decorateAdminLead(lead: any, today: string) {
  return {
    ...lead,
    interest_display: lead.product
      ? getProductDisplayName(lead.product)
      : lead.interest_text || null,
    interest_matched: Boolean(lead.product),
    followup: lead.is_customer || !lead.chat_date ? null : getLeadFollowup(lead.chat_date, today),
  };
}

// The panel picks the interest product from a list, so there is no fuzzy
// matching here: either a product id, or free text when it is not in the catalog.
async function normalizeAdminInterest(body: Record<string, unknown>) {
  const productId = String(body.interest_product_id ?? "").trim();

  if (productId) {
    if (!UUID_PATTERN.test(productId)) throw new LeadInputError("Interest product is invalid");

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("id, name, label, volume")
      .eq("id", productId)
      .maybeSingle();
    if (error) throw new Error("Failed to load interest product");
    if (!product) throw new LeadInputError("Interest product was not found");

    return {
      interest_product_id: product.id,
      interest_text: getProductDisplayName(product),
    };
  }

  const text = String(body.interest_text ?? "").trim();
  if (text.length > 200) {
    throw new LeadInputError("Interest must be 200 characters or fewer");
  }
  return { interest_product_id: null, interest_text: text || null };
}

// Validates panel input with the same rules as the bot (phone format, enums,
// chat_date not in the future). Only keys present in the body are returned
// when partial is true.
export async function normalizeAdminLeadInput(
  body: Record<string, unknown>,
  { partial }: { partial: boolean },
) {
  const allowedKeys = partial ? UPDATE_KEYS : CREATE_KEYS;
  const picked = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowedKeys.includes(key)),
  );

  const { data } = await normalizeLeadInput(picked, { partial });

  if (body.interest_product_id !== undefined || body.interest_text !== undefined) {
    Object.assign(data, await normalizeAdminInterest(body));
  }

  return data;
}
