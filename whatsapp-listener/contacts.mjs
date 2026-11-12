// Leads as contacts in the CS WhatsApp account, saved through this linked
// device like "New contact" on WhatsApp Web. They live in WhatsApp only (not
// the phone address book) and show on the phone and every linked device.
// This is the only thing the listener writes to WhatsApp (see
// readonly.test.mjs); it never sends messages.
//
// The API decides what to save (/api/bot/whatsapp/contacts/pending) and keeps
// the result (/contacts/result). Writes are spaced out (delayMs) so a backfill
// never looks like a burst.

export const CONTACT_DELAY_MS = 3_000;
export const jidOf = (phone) => `${phone}@s.whatsapp.net`;

// Right after the first login WhatsApp has not shared the sync keys yet:
// not the lead's fault, try again on the next round without recording it.
const isNotReadyError = (message) => /app state key|key not present|not connected|connection closed/i.test(message);

export function createContactSync({ api, getSocket, isReady, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), delayMs = CONTACT_DELAY_MS, log = () => {}, now = () => new Date().toISOString() }) {
  const state = { running: false, last: null, savedTotal: 0, failedTotal: 0 };

  async function save(sock, item) {
    if (item.previous_phone) await sock.removeContact(jidOf(item.previous_phone));
    let lidJid = null;
    try {
      lidJid = (await sock.signalRepository?.lidMapping?.getLIDForPN?.(jidOf(item.phone))) || null;
    } catch {
      // Optional: WhatsApp links the number to its LID itself.
    }
    await sock.addOrEditContact(jidOf(item.phone), {
      fullName: item.name,
      firstName: item.name,
      saveOnPrimaryAddressbook: false,
      ...(lidJid ? { lidJid } : {}),
    });
  }

  // wa: that lead now (!synccontacts <wa>); backfill: older leads too.
  async function run({ wa = null, backfill = false, limit = 10 } = {}) {
    if (state.running) return { result: "busy" };
    if (!isReady()) return { result: "not_connected" };
    state.running = true;
    const summary = { result: "done", at: null, saved: 0, failed: 0, pending: 0, remaining: null, error: null, lead: null, items: [] };
    try {
      const pending = await api("/api/bot/whatsapp/contacts/pending", { limit, backfill, ...(wa ? { wa } : {}) });
      const items = pending.items || [];
      summary.pending = items.length;
      summary.lead = pending.lead || null;
      const results = [];
      for (const [index, item] of items.entries()) {
        if (index) await sleep(delayMs);
        const sock = getSocket();
        if (!sock || !isReady()) {
          summary.error = "WhatsApp terputus, sisanya dicoba lagi nanti";
          break;
        }
        try {
          await save(sock, item);
          results.push({ lead_id: item.lead_id, ok: true, name: item.name, phone: item.phone });
          summary.saved += 1;
          summary.items.push({ name: item.name, ok: true });
        } catch (error) {
          const message = String(error?.message || error || "error").slice(0, 200);
          summary.error = message;
          if (isNotReadyError(message)) {
            summary.error = `WhatsApp belum siap menyimpan kontak (${message}), dicoba lagi nanti`;
            break;
          }
          results.push({ lead_id: item.lead_id, ok: false, error: message });
          summary.failed += 1;
          summary.items.push({ name: item.name, ok: false, error: message });
        }
      }
      if (results.length) await api("/api/bot/whatsapp/contacts/result", { as_of: pending.as_of, results });
      if (pending.remaining !== null && pending.remaining !== undefined) summary.remaining = Math.max(0, pending.remaining - summary.saved);
      if (summary.saved || summary.failed) log(`kontak WA: ${summary.saved} disimpan${summary.failed ? `, ${summary.failed} gagal` : ""}`);
    } catch (error) {
      summary.error = String(error?.message || error).slice(0, 200);
      log(`kontak WA gagal: ${summary.error}`);
    } finally {
      summary.at = now();
      state.running = false;
      state.savedTotal += summary.saved;
      state.failedTotal += summary.failed;
      // Rounds with nothing to do are not worth showing in !wastatus.
      if (summary.pending || summary.error || wa || backfill) state.last = summary;
    }
    return summary;
  }

  return { run, state };
}
