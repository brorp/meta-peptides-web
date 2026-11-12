import { resolveLeadIdentifier } from "@/lib/discord-bot-data";
import { planContacts, type ContactCandidate } from "@/lib/lead-wa-contacts-core";
import { supabaseAdmin } from "@/lib/supabase-server";

// Leads as contacts in the CS WhatsApp account (migration 20261111100000).
// The WhatsApp listener asks for the contacts to save (pendingWaContacts),
// saves them through its linked device, and reports back
// (recordWaContactResults). Lead routes need no hook: a lead that changes gets
// a newer updated_at, so lead_wa_contact_candidates() returns it again.

export const WA_CONTACT_MIGRATION_MESSAGE =
  "Database belum di-update untuk kontak WhatsApp. Jalankan migration 20261111100000_add_whatsapp_contact_to_leads.sql di Supabase.";

// New leads become contacts by themselves; older leads only with
// !synccontacts, so the first deploy does not save hundreds of contacts at
// once.
const NEW_LEAD_DAYS = 14;
const CANDIDATE_COLUMNS = "id, whatsapp_phone, full_name, origin, chat_date, status, wa_contact_name, wa_contact_phone";

type PendingOptions = { limit?: number; backfill?: boolean; wa?: string | null };
type PendingResult =
  | { error: string; status: number }
  | { as_of: string; items: ReturnType<typeof planContacts>["items"]; remaining: number | null; lead?: { whatsapp_phone: string; full_name: string } };

export async function pendingWaContacts({ limit = 10, backfill = false, wa = null }: PendingOptions = {}): Promise<PendingResult> {
  const asOf = new Date().toISOString();
  const size = Math.min(Math.max(Math.trunc(limit) || 10, 1), 50);

  if (wa) {
    const resolved = await resolveLeadIdentifier(wa);
    if (!resolved.data) return { error: resolved.error, status: 404 };
    const { data, error } = await supabaseAdmin.from("leads").select(CANDIDATE_COLUMNS).eq("id", resolved.data.id).maybeSingle();
    if (error || !data) return { error: WA_CONTACT_MIGRATION_MESSAGE, status: 503 };
    const row = data as ContactCandidate;
    return {
      as_of: asOf,
      items: planContacts([row], { force: true }).items,
      remaining: null,
      lead: { whatsapp_phone: row.whatsapp_phone, full_name: row.full_name },
    };
  }

  const since = backfill ? null : new Date(Date.now() - NEW_LEAD_DAYS * 864e5).toISOString();
  // A few extra rows: leads whose contact already matches are only marked.
  const { data, error } = await supabaseAdmin.rpc("lead_wa_contact_candidates", { p_limit: size * 3, p_created_since: since });
  if (error) return { error: WA_CONTACT_MIGRATION_MESSAGE, status: 503 };
  const { items, unchanged } = planContacts((data || []) as ContactCandidate[]);
  if (unchanged.length) {
    await supabaseAdmin.from("leads").update({ wa_contact_synced_at: asOf }).in("id", unchanged);
  }

  let remaining: number | null = null;
  if (backfill) {
    const { count } = await supabaseAdmin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .is("wa_contact_name", null)
      .neq("status", "skip");
    remaining = Number(count || 0);
  }
  return { as_of: asOf, items: items.slice(0, size), remaining };
}

export type WaContactResult = { lead_id: string; ok: boolean; name?: string; phone?: string; error?: string };

// as_of: when the listener asked. A lead changed after that stays a candidate.
export async function recordWaContactResults(results: WaContactResult[], asOf: string) {
  const now = new Date().toISOString();
  let saved = 0;
  for (const result of results) {
    const values = result.ok
      ? {
          wa_contact_name: String(result.name || "").slice(0, 200),
          wa_contact_phone: String(result.phone || "").replace(/\D/g, "") || null,
          wa_contact_synced_at: asOf,
          wa_contact_error: null,
          wa_contact_attempted_at: now,
        }
      : { wa_contact_error: String(result.error || "Gagal menyimpan kontak").slice(0, 300), wa_contact_attempted_at: now };
    const { error } = await supabaseAdmin.from("leads").update(values).eq("id", result.lead_id);
    if (error) return { error: WA_CONTACT_MIGRATION_MESSAGE, saved };
    if (result.ok) saved += 1;
  }
  return { error: null, saved };
}
