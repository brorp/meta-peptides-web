import assert from "node:assert/strict";
import { test } from "node:test";
import { contactDisplayName, planContacts } from "../lib/lead-wa-contacts-core.ts";

const row = (overrides = {}) => ({
  id: "lead-1",
  whatsapp_phone: "6281234567890",
  full_name: "Budi Santoso",
  origin: "ads",
  chat_date: "2026-11-06",
  wa_contact_name: null,
  wa_contact_phone: null,
  ...overrides,
});

test("contact name: name, origin and chat date", () => {
  assert.equal(contactDisplayName(row()), "Budi Santoso • Lead Ads 06/11");
  assert.equal(contactDisplayName(row({ origin: "unknown" })), "Budi Santoso • Lead WA 06/11");
  assert.equal(contactDisplayName(row({ origin: "existing", chat_date: "2026-05-20" })), "Budi Santoso • Customer 20/05");
  assert.equal(contactDisplayName(row({ full_name: "  ", whatsapp_phone: "6281234567890" })), "WA 7890 • Lead Ads 06/11");
  assert.equal(contactDisplayName(row({ full_name: `  Budi \n  ${"x".repeat(100)}` })).length, 80 + " • Lead Ads 06/11".length);
});

test("plan: new contacts, renamed ones, changed numbers; matching ones are only marked", () => {
  const { items, unchanged } = planContacts([
    row(),
    row({ id: "lead-2", wa_contact_name: "Budi Santoso • Lead Ads 06/11", wa_contact_phone: "6281234567890" }),
    row({ id: "lead-3", full_name: "Budi S", wa_contact_name: "Budi Santoso • Lead Ads 06/11", wa_contact_phone: "6281234567890" }),
    row({ id: "lead-4", whatsapp_phone: "6289999999999", wa_contact_name: "Budi Santoso • Lead Ads 06/11", wa_contact_phone: "6281234567890" }),
    row({ id: "lead-5", whatsapp_phone: "" }),
  ]);
  assert.deepEqual(unchanged, ["lead-2"]);
  assert.deepEqual(items, [
    { lead_id: "lead-1", phone: "6281234567890", name: "Budi Santoso • Lead Ads 06/11", previous_phone: null },
    { lead_id: "lead-3", phone: "6281234567890", name: "Budi S • Lead Ads 06/11", previous_phone: null },
    { lead_id: "lead-4", phone: "6289999999999", name: "Budi Santoso • Lead Ads 06/11", previous_phone: "6281234567890" },
  ]);
});

test("force (!synccontacts <wa>) saves again even when it matches", () => {
  const saved = row({ wa_contact_name: "Budi Santoso • Lead Ads 06/11", wa_contact_phone: "6281234567890" });
  assert.equal(planContacts([saved]).items.length, 0);
  assert.deepEqual(planContacts([saved], { force: true }).items, [
    { lead_id: "lead-1", phone: "6281234567890", name: "Budi Santoso • Lead Ads 06/11", previous_phone: null },
  ]);
});
