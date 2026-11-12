// Pure parts of the WhatsApp contacts for leads (name, what to save). No
// imports, so this can be tested without Supabase.

export type ContactLead = {
  full_name: string;
  whatsapp_phone: string;
  origin: string;
  chat_date: string;
};

export type ContactCandidate = ContactLead & {
  id: string;
  wa_contact_name: string | null;
  wa_contact_phone: string | null;
};

// What the WhatsApp listener saves: the contact under `phone`, and, when the
// lead's number changed, removes the one under `previous_phone` first.
export type ContactItem = { lead_id: string; phone: string; name: string; previous_phone: string | null };

const ORIGIN_LABELS: Record<string, string> = {
  ads: "Ads",
  tokopedia: "Tokopedia",
  instagram: "IG",
  threads: "Threads",
  tiktok: "TikTok",
  fnf: "FnF",
  shopee: "Shopee",
  website: "Web",
  unknown: "WA",
};

// "Budi Santoso • Lead Ads 06/11"; customers from before the bot:
// "Rina • Customer 20/05".
export function contactDisplayName(lead: ContactLead) {
  const name = String(lead.full_name || "").replace(/\s+/g, " ").trim().slice(0, 80) || `WA ${String(lead.whatsapp_phone).slice(-4)}`;
  const [, month, day] = String(lead.chat_date || "").split("-");
  const date = day && month ? ` ${day}/${month}` : "";
  const label = lead.origin === "existing" ? "Customer" : `Lead ${ORIGIN_LABELS[lead.origin] || lead.origin}`;
  return `${name} • ${label}${date}`;
}

export const contactPhone = (value: string) => String(value || "").replace(/\D/g, "");

// Splits candidates into contacts to save and leads whose contact already
// matches (only marked as checked). force: save even when it matches (the CS
// may have deleted the contact on the phone).
export function planContacts(rows: ContactCandidate[], { force = false } = {}) {
  const items: ContactItem[] = [];
  const unchanged: string[] = [];
  for (const row of rows) {
    const phone = contactPhone(row.whatsapp_phone);
    const name = contactDisplayName(row);
    if (!phone) continue;
    const previous = row.wa_contact_phone ? contactPhone(row.wa_contact_phone) : null;
    if (!force && row.wa_contact_name === name && previous === phone) {
      unchanged.push(row.id);
      continue;
    }
    items.push({ lead_id: row.id, phone, name, previous_phone: previous && previous !== phone ? previous : null });
  }
  return { items, unchanged };
}
