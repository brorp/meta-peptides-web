import {
  LEAD_ORIGINS,
  LEAD_REJECTIONS,
  LEAD_STATUSES,
  getJakartaDate,
  isEmptyBotValue,
  normalizeBotPhone,
  normalizeEnumValue,
  parseDateOnly,
} from "@/lib/discord-bot-data";
import {
  ProductMatchError,
  getProductDisplayName,
  resolveProductQuery,
} from "@/lib/discord-bot-products";

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
