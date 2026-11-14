import assert from "node:assert/strict";
import test from "node:test";
import { analysisDigest, escapeDiscord, isDiscordWebhookUrl, leadCardText, packMessages, postDiscord } from "./discord.mjs";

test("only Discord webhook URLs are used", () => {
  assert.equal(isDiscordWebhookUrl("https://discord.com/api/webhooks/1/abc"), true);
  assert.equal(isDiscordWebhookUrl("https://evil.test/api/webhooks/1/abc"), false);
  assert.equal(isDiscordWebhookUrl("http://discord.com/api/webhooks/1/abc"), false);
  assert.equal(isDiscordWebhookUrl(""), false);
});

test("customer text cannot add formatting, mentions or fake lines", () => {
  assert.equal(escapeDiscord("**gratis** @everyone <@123>\n> palsu"), "\\*\\*gratis\\*\\* \\@everyone \\<\\@123\\> \\> palsu");
  assert.equal(escapeDiscord("# judul"), "\\# judul");
  assert.equal(escapeDiscord("harga: 1.750.000 - mau 2"), "harga: 1.750.000 - mau 2");
  assert.equal(escapeDiscord("a".repeat(300)).length, 200);
});

test("new lead card", () => {
  const text = leadCardText(
    { action: "lead_created", lead: { whatsapp_phone: "6281234567890", full_name: "Budi_", origin: "ads", status: "warm" } },
    { phone: "6281234567890", text: "Halo kak", message_type: "text" },
  );
  assert.equal(text, [
    "🆕 **Lead baru dari WhatsApp** • ⏳ belum dianalisa",
    "**Budi\\_** • [6281234567890](<https://wa.me/6281234567890>) • origin **ads** • status warm",
    "> Halo kak",
    "Koreksi kalau perlu: `!updateleads 6281234567890` lalu `name:` / `origin:` / `status:`",
  ].join("\n"));
});

test("old customer card and media preview", () => {
  const text = leadCardText(
    { action: "lead_created_existing_customer", existing_customer: "sudah 3 order sejak 2026-05-20, terakhir 2026-10-09", lead: { whatsapp_phone: "6285733660667", full_name: "Rina", origin: "existing" } },
    { phone: "6285733660667", text: null, message_type: "audio" },
  );
  assert.match(text, /^🔁 \*\*Customer lama chat lagi\*\* • sudah 3 order sejak 2026\\-05\\-20|^🔁 \*\*Customer lama chat lagi\*\* • sudah 3 order sejak 2026-05-20/);
  assert.match(text, /> _\(🎤 voice note\)_$/);
});

test("webhook post disables mentions", async () => {
  let sent;
  const ok = await postDiscord("https://discord.com/api/webhooks/1/abc", "hi", {
    fetchImpl: async (url, init) => {
      sent = JSON.parse(init.body);
      return new Response(null, { status: 204 });
    },
  });
  assert.equal(ok, true);
  assert.deepEqual(sent.allowed_mentions, { parse: [] });
  assert.equal(await postDiscord("https://evil.test/x", "hi"), false);
});

test("analysis digest: suggestions with !applyai, ghosting list, counts and tokens", () => {
  const [text, ...rest] = analysisDigest({
    items: [
      { result: "suggested", whatsapp_phone: "6281234567890", full_name: "Budi_", current_status: "warm", status: "hot", interest: "Retatrutide 10mg", goal: "turun BB", domicile: null, rejection: null, evidence: "rekeningnya apa kak? @everyone", confidence: "high", changes: ["status"], applied: [], input_tokens: 4200, output_tokens: 600 },
      { result: "suggested", whatsapp_phone: "6281300001234", full_name: "Sari", current_status: "warm", status: "cold", rejection: "harga", interest: null, goal: null, domicile: null, evidence: null, confidence: "medium", changes: ["status", "rejection", "goal"], applied: ["status", "rejection"], input_tokens: 3000, output_tokens: 400 },
      { result: "no_change", input_tokens: 2000, output_tokens: 200 },
      { result: "not_enough_info" },
      { result: "refusal", whatsapp_phone: "6281399999999" },
      { result: "error", error: "Claude API error 529" },
    ],
    ghosted: [{ whatsapp_phone: "6281211112222", full_name: "Diam", previous_status: "warm" }],
    error: null,
  }, "12.00");
  assert.equal(rest.length, 0);
  assert.equal(text, [
    "🧠 **Analisa chat 12.00** • 6 lead dibaca • 2 usulan • 1 ghosting",
    "",
    "**Budi\\_** · [6281234567890](<https://wa.me/6281234567890>) · 🌤️ warm → **🔥 hot** · yakin",
    "minat Retatrutide 10mg · goal turun BB",
    "> rekeningnya apa kak? \\@everyone",
    "`!applyai 6281234567890`",
    "",
    "**Sari** · [6281300001234](<https://wa.me/6281300001234>) · 🌤️ warm → **❄️ cold** · cukup yakin",
    "alasan harga",
    "✅ diterapkan otomatis (status, rejection) · `!applyai 6281300001234` untuk goal",
    "",
    "❄️ **Ghosting** (tidak membalas > 3 hari, otomatis jadi cold):",
    "• Diam (6281211112222), sebelumnya warm",
    "",
    "ℹ️ 1 tanpa perubahan • 1 chat belum cukup info • 1 tidak mau dianalisa AI (6281399999999) • 1 gagal (Claude API error 529)",
    "Token: masuk 9.2k / keluar 1.2k",
  ].join("\n"));
});

test("analysis digest: nothing to tell -> no message; a stop error is reported", () => {
  assert.deepEqual(analysisDigest({ items: [], ghosted: [], error: null }, "23.00"), []);
  const [text] = analysisDigest({ items: [], ghosted: [], error: "ANTHROPIC_API_KEY ditolak" }, "23.00");
  assert.match(text, /⚠️ Analisa berhenti: ANTHROPIC\\_API\\_KEY ditolak$/);
});

test("long digests are split under the Discord limit without cutting lines", () => {
  const lines = Array.from({ length: 100 }, (_, i) => `baris ${i} ${"x".repeat(50)}`);
  const messages = packMessages(lines, 500);
  assert.ok(messages.length > 1);
  assert.ok(messages.every((m) => m.length <= 500));
  assert.deepEqual(messages.join("\n").split("\n"), lines);
});
