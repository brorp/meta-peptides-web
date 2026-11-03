import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { COMMAND_SPECS, getCommandSpec } from "./commands.mjs";
import { syncReadme } from "./gen-docs.mjs";
import { buildCommandHelp, buildHelpIndex, buildTemplate } from "./help.mjs";
import { CommandInputError, assertKnownFields, parseCommandMessage } from "./parser.mjs";

const ORDER = {
  id: "11111111-1111-4111-8111-111111111111",
  invoice_number: "MW-20261031-01001",
  order_date: "2026-10-31",
  lead_id: "22222222-2222-4222-8222-222222222222",
  shipping_name: "Budi",
  shipping_phone: "6281234567890",
  shipping_address: "Jl. Mawar 1",
  shipping_regional: "Tangerang",
  subtotal: 3500000,
  voucher_discount_amount: 0,
  total_price: 3500000,
  is_paid: false,
  status: "processing",
  payment: { payment_type: "Bank Transfer", payment_amount: 3000000, payment_date: "2026-10-30T17:00:00+00:00" },
  order_items: [
    {
      display_name: "Retatrutide 10mg",
      quantity: 2,
      price_at_purchase: 1750000,
      effective_usage_days: 56,
      reorder_date: "2026-12-26",
      missing_usage_life: false,
    },
    { display_name: "BPC-157 10 mg", quantity: 1, price_at_purchase: 0, effective_usage_days: 0, reorder_date: null, missing_usage_life: true },
  ],
};

async function run(content, responses = {}, attachments = []) {
  const parsed = parseCommandMessage(content, getCommandSpec);
  const spec = COMMAND_SPECS[parsed.command];
  const calls = [];
  const replies = [];
  const plains = [];
  const answer = (key) => {
    if (!(key in responses)) throw new Error(`Unexpected API call ${key}`);
    return structuredClone(responses[key]);
  };
  const reply = async (text, files = []) => replies.push({ text, files });

  await spec.handler({
    message: { attachments: { find: (fn) => attachments.find(fn) } },
    parsed,
    name: parsed.command,
    spec,
    config: { brandName: "MetaPeptides", paymentInfo: "" },
    reply,
    send: reply,
    sendPlain: async (text) => plains.push(text),
    api: {
      get: async (path, options = {}) => {
        calls.push({ method: "GET", path, query: options.query });
        return answer(`GET ${path}`);
      },
      post: async (path, json) => {
        calls.push({ method: "POST", path, json });
        return answer(`POST ${path}`);
      },
      patch: async (path, json) => {
        calls.push({ method: "PATCH", path, json });
        return answer(`PATCH ${path}`);
      },
      file: async (path, options = {}) => {
        calls.push({ method: "FILE", path, query: options.query });
        return Buffer.from("%PDF-1.4");
      },
    },
  });
  return { calls, replies, plains };
}

test("every help template is valid input for its command", () => {
  for (const [name, spec] of Object.entries(COMMAND_SPECS)) {
    const template = buildTemplate(spec);
    const parsed = parseCommandMessage(template, getCommandSpec);
    assert.equal(parsed.command, name, name);
    assertKnownFields(parsed, (spec.fields || []).map((field) => field.name), name);
    for (const field of spec.fields || []) {
      if (field.required) assert.ok(parsed.get(field.name), `${name} template missing ${field.name}`);
    }
  }
  const index = buildHelpIndex(COMMAND_SPECS);
  for (const spec of Object.values(COMMAND_SPECS)) assert.ok(index.includes(spec.usage), spec.usage);
});

test("!newleads sends only the create fields", async () => {
  const lead = {
    full_name: "Budi", whatsapp_phone: "6281234567890", status: "hot", origin: "ads",
    chat_date: "2026-10-31", is_customer: false, interest_text: "reta", product: null,
  };
  const { calls, replies } = await run(
    `!newleads
wa: 0812-3456-7890
name: Budi
origin: ads
status: hot
interest: reta
rejection: -`,
    {
      "POST /api/bot/leads": {
        lead,
        interest_warning: 'Produk "reta" cocok ke lebih dari satu produk. Interest disimpan sebagai teks saja.',
        interest_candidates: ["Retatrutide 10mg", "Retatrutide 20mg"],
      },
    },
  );
  assert.deepEqual(calls[0].json, {
    wa: "0812-3456-7890", name: "Budi", origin: "ads", status: "hot", interest: "reta", rejection: "-",
  });
  assert.match(replies[0].text, /Lead baru tersimpan/);
  assert.match(replies[0].text, /Chat: 2026-10-31 • Customer: belum/);
  assert.doesNotMatch(replies[0].text, /Notes:|Domisili:/, "empty optional lines are hidden");
  assert.match(replies[0].text, /Pilihan: Retatrutide 10mg \| Retatrutide 20mg/);
  assert.match(replies[0].text, /Tambah domicile\/goal\/notes: `!updateleads 6281234567890`/);
});

test("!newleads points update-only fields to !updateleads", async () => {
  const base = "!newleads\nwa: 0812\nname: Budi\norigin: ads\nstatus: hot\n";
  await assert.rejects(run(`${base}notes: Tanya dosis\ndomicile: Tangerang`), (error) => {
    assert.ok(error instanceof CommandInputError);
    assert.match(error.message, /Hapus baris notes, domicile dari !newleads/);
    assert.match(error.message, /diisi lewat `!updateleads <wa>`/);
    assert.doesNotMatch(error.message, /otomatis/);
    return true;
  });
  await assert.rejects(run(`${base}is_customer: false`), (error) => {
    assert.match(error.message, /Hapus baris is_customer/);
    assert.match(error.message, /is_customer otomatis false/);
    assert.doesNotMatch(error.message, /!updateleads/);
    return true;
  });
});

test("!newleads accepts an optional chat_date", async () => {
  const lead = {
    full_name: "Budi", whatsapp_phone: "6281234567890", status: "warm", origin: "ads",
    chat_date: "2026-10-30", is_customer: false, product: null,
  };
  const base = "!newleads\nwa: 081234567890\nname: Budi\norigin: ads\nstatus: warm\n";
  const { calls, replies } = await run(`${base}chat_date: 2026-10-30`, { "POST /api/bot/leads": { lead } });
  assert.equal(calls[0].json.chat_date, "2026-10-30");
  assert.match(replies[0].text, /Chat: 2026-10-30/);

  const withoutDate = await run(base, { "POST /api/bot/leads": { lead } });
  assert.equal("chat_date" in withoutDate.calls[0].json, false, "server fills today when omitted");

  await assert.rejects(run(`${base}chat_date: 30-10-2026`), /chat_date harus format YYYY-MM-DD/);
});

test("!updateleads accepts domicile, goal and multi-line notes", async () => {
  const lead = {
    full_name: "Budi", whatsapp_phone: "6281234567890", status: "warm", origin: "ads", chat_date: "2026-10-31",
    is_customer: false, domicile: "Tangerang", goal: "turun BB", notes: "Tanya dosis\nJam: 10 pagi", product: null,
  };
  const { calls, replies } = await run(
    "!updateleads 0812 3456 7890\ndomicile: Tangerang\ngoal: turun BB\nnotes: Tanya dosis\nJam: 10 pagi\nis_customer: ya",
    { "PATCH /api/bot/leads/0812%203456%207890": { lead, changed_fields: ["domicile", "goal", "notes", "is_customer"] } },
  );
  assert.deepEqual(calls[0].json, {
    domicile: "Tangerang", goal: "turun BB", notes: "Tanya dosis\nJam: 10 pagi", is_customer: true,
  });
  assert.match(replies[0].text, /Domisili: Tangerang • Goal: turun BB/);
  assert.match(replies[0].text, /Notes: Tanya dosis \/ Jam: 10 pagi/);
});

test("README command reference matches the command specs", () => {
  const readme = readFileSync(new URL("./README.md", import.meta.url), "utf8");
  assert.equal(syncReadme(readme), readme, "Run `npm run docs` in discord-bot to update README.md");
});

test("!newleads lists missing required fields", async () => {
  await assert.rejects(
    run("!newleads\nwa: 0812\nname: Budi\norigin: ads"),
    (error) => error instanceof CommandInputError && /Field wajib belum diisi: status/.test(error.message),
  );
});

test("!invoice posts items, attaches PDF and sends customer text", async () => {
  const { calls, replies, plains } = await run(
    `!invoice
lead: 081234567890
address: Jl. Mawar 1
city: Tangerang
item: 2 | reta 10 mg
item: 1 | bpc | 0
discount: 0`,
    { "POST /api/bot/invoices": ORDER },
  );
  assert.deepEqual(calls[0].json.items, [
    { quantity: 2, query: "reta 10 mg", price: null },
    { quantity: 1, query: "bpc", price: 0 },
  ]);
  // Not written, so the API picks the default (Bank Transfer for WhatsApp).
  assert.equal(calls[0].json.payment_type, undefined);
  assert.equal(calls[0].json.order_type, undefined);
  assert.equal(calls[0].json.marketplace_fee, undefined);
  assert.deepEqual(calls[1], {
    method: "FILE",
    path: "/api/bot/orders/MW-20261031-01001/pdf",
    query: { type: "invoice" },
  });
  assert.equal(replies[0].files.length, 1);
  assert.match(replies[0].text, /Invoice MW-20261031-01001 dibuat\*\* • stok dipotong • lead ditandai customer/);
  assert.match(replies[0].text, /Customer: \*\*Budi\*\* • <https:\/\/wa\.me\/6281234567890>/);
  assert.match(replies[0].text, /Retatrutide 10mg → 26 Des 2026 \(56 hari/);
  assert.match(replies[0].text, /Belum ada usage_life: BPC-157 10 mg/);
  assert.match(plains[0], /^\*INVOICE MW-20261031-01001\*/);
});

const SHOPEE_ORDER = {
  ...ORDER,
  order_source: "shopee",
  manual_reference: "2411010ABC123",
  marketplace_fee: 175000,
  total_price: 3325000,
  payment: { payment_type: "Shopee" },
};

test("!invoice Shopee sends order type and fee, shows net total, skips WhatsApp text", async () => {
  const { calls, replies, plains } = await run(
    `!invoice
lead: 081234567890
address: Jl. Mawar 1
city: Tangerang
item: 2 | reta 10 mg
order_type: shopee
marketplace_fee: 175rb
marketplace_order_no: 2411010ABC123`,
    { "POST /api/bot/invoices": SHOPEE_ORDER },
  );
  assert.equal(calls[0].json.order_type, "shopee");
  assert.equal(calls[0].json.marketplace_fee, 175000);
  assert.equal(calls[0].json.marketplace_order_no, "2411010ABC123");
  assert.equal(calls[0].json.payment_type, undefined);
  assert.equal(calls[0].json.discount, 0);
  assert.equal(replies[0].files.length, 1, "PDF still attached");
  assert.match(replies[0].text, /Invoice MW-20261031-01001 dibuat\*\* \(order Shopee\)/);
  assert.match(replies[0].text, /Subtotal Rp3\.500\.000 • Fee Shopee -Rp175\.000 • \*\*Total bersih Rp3\.325\.000\*\*/);
  assert.match(replies[0].text, /Order Shopee • No\. pesanan 2411010ABC123 • Pembayaran: Shopee/);
  assert.match(replies[0].text, /teks invoice WhatsApp tidak dikirim/);
  assert.equal(plains.length, 0, "no WhatsApp text for marketplace orders");
});

// Tokopedia buyer who is not a lead: saved with "-" as the phone.
const TOKOPEDIA_NO_LEAD_ORDER = {
  ...ORDER,
  lead_id: null,
  shipping_name: "Siti Rahma",
  shipping_phone: "-",
  order_source: "tokopedia",
  manual_reference: "INV/20261103/MPL/123",
  marketplace_fee: 175000,
  total_price: 3325000,
  payment: { payment_type: "Tokopedia" },
  reminders_enabled: false,
};

test("!invoice Tokopedia without a lead sends the buyer name instead", async () => {
  const { calls, replies, plains } = await run(
    `!invoice
order_type: tokopedia
name: Siti Rahma
address: Jl. Melati 2
city: Bandung
item: 2 | reta 10 mg
marketplace_fee: 175rb
marketplace_order_no: INV/20261103/MPL/123`,
    { "POST /api/bot/invoices": TOKOPEDIA_NO_LEAD_ORDER },
  );
  assert.equal(calls[0].json.lead, undefined);
  assert.equal(calls[0].json.name, "Siti Rahma");
  assert.equal(calls[0].json.order_type, "tokopedia");
  assert.equal(calls[0].json.marketplace_order_no, "INV/20261103/MPL/123");
  assert.match(replies[0].text, /Invoice MW-20261031-01001 dibuat\*\* \(order Tokopedia\) • stok dipotong\n/);
  assert.doesNotMatch(replies[0].text, /lead ditandai customer/);
  assert.match(replies[0].text, /Customer: \*\*Siti Rahma\*\* • tanpa nomor WA/);
  assert.match(replies[0].text, /tidak masuk !aftersales dan !reorder/);
  assert.doesNotMatch(replies[0].text, /Jadwal reorder reminder/);
  assert.equal(plains.length, 0, "no WhatsApp text");
});

test("!updateshipping skips the resi text when the buyer has no WhatsApp number", async () => {
  const { replies, plains } = await run(
    "!updateshipping MW-20261031-01001\nshipment_type: J&T Express\ntracking_number: JX123",
    {
      "PATCH /api/bot/orders/MW-20261031-01001/shipping": {
        ...TOKOPEDIA_NO_LEAD_ORDER,
        shipment_type: "J&T Express",
        shipping_fee: 0,
        tracking_number: "JX123",
        shipping_expense_recorded: false,
      },
    },
  );
  assert.match(replies[0].text, /Pembeli tanpa nomor WA: resi terlihat di Tokopedia, jadi teks info resi tidak dikirim/);
  assert.equal(plains.length, 0);
});

test("!help invoice says when lead and name are required", () => {
  const help = buildCommandHelp("!invoice", COMMAND_SPECS["!invoice"]);
  assert.match(help, /\*\*Wajib:\*\* `lead` \(untuk order whatsapp\), `name` \(untuk order shopee\/tokopedia tanpa lead\), `address`/);
  assert.doesNotMatch(help, /\*\*Opsional:\*\*[^\n]*`lead`/);
  assert.match(help, /• `lead` \(wajib untuk order whatsapp\) — /);
});

test("!updateshipping lets Shopee orders skip shipping_fee", async () => {
  const { calls, replies } = await run(
    "!updateshipping MW-20261031-01001\nshipment_type: SPX Standard\ntracking_number: SPXID123",
    {
      "PATCH /api/bot/orders/MW-20261031-01001/shipping": {
        ...SHOPEE_ORDER,
        shipment_type: "SPX Standard",
        shipping_fee: 0,
        tracking_number: "SPXID123",
        shipping_expense_recorded: false,
      },
    },
  );
  assert.equal(calls[0].json.shipping_fee, undefined);
  assert.match(replies[0].text, /Ongkir: diurus Shopee/);
  assert.doesNotMatch(replies[0].text, /dicatat sebagai expense/);
});

test("!updateshipping says when the shipping cost became an expense", async () => {
  const { replies, plains } = await run(
    "!updateshipping MW-20261031-01001\nshipment_type: JNE REG\nshipping_fee: 25000\ntracking_number: JP1",
    {
      "PATCH /api/bot/orders/MW-20261031-01001/shipping": {
        ...ORDER,
        order_source: "manual_whatsapp",
        shipment_type: "JNE REG",
        shipping_fee: 25000,
        tracking_number: "JP1",
        shipping_expense_recorded: true,
      },
    },
  );
  assert.match(replies[0].text, /Ongkir: Rp25\.000 \(dicatat sebagai expense\)/);
  assert.match(replies[0].text, /Teks info resi untuk customer ada di pesan berikut/);
  assert.equal(plains.length, 1, "WhatsApp orders still get the resi text");
});

test("!payment on a Shopee order accepts the price before the fee", async () => {
  const image = { contentType: "image/png", url: "https://cdn.discordapp.com/b.png", size: 1000 };
  const { replies } = await run(
    "!payment MW-20261031-01001\namount: 3500000\npayment_type: Shopee",
    {
      "POST /api/bot/orders/MW-20261031-01001/payment": {
        ...SHOPEE_ORDER,
        is_paid: true,
        payment: { payment_type: "Shopee", payment_amount: 3500000, payment_date: "2026-10-31T03:00:00+00:00" },
        payment_difference: 175000,
      },
    },
    [image],
  );
  assert.match(replies[0].text, /Nominal sesuai harga sebelum fee Shopee ✅ \(total bersih setelah fee Rp3\.325\.000\)/);
  assert.doesNotMatch(replies[0].text, /Lebih bayar/);
});

test("!payment requires an image and warns about underpayment", async () => {
  await assert.rejects(
    run("!payment MW-20261031-01001\namount: 3000000\npayment_type: QRIS"),
    /Upload foto bukti pembayaran/,
  );

  const image = { contentType: "image/jpeg", url: "https://cdn.discordapp.com/a.jpg", size: 1000 };
  const { calls, replies } = await run(
    "!payment MW-20261031-01001\namount: 3jt\npayment_type: QRIS",
    { "POST /api/bot/orders/MW-20261031-01001/payment": { ...ORDER, is_paid: true, payment_difference: -500000 } },
    [image],
  );
  assert.deepEqual(calls[0].json, {
    amount: 3000000,
    payment_type: "QRIS",
    payment_date: undefined,
    proof_url: image.url,
    proof_content_type: "image/jpeg",
    proof_size: 1000,
  });
  assert.equal(calls[1].query.type, "packing-slip");
  assert.match(replies[0].text, /Kurang bayar Rp500\.000/);
  assert.match(replies[0].text, /31 Okt 2026/);
});

test("date-range commands default to one day", async () => {
  const { calls } = await run("!followup 2026-11-01", {
    "GET /api/bot/followups": { groups: { h1: [], h3: [], h7: [] } },
  });
  assert.deepEqual(calls[0].query, { date_from: "2026-11-01", date_to: "2026-11-01" });

  const reorder = await run("!reorderlast 2026-11-01 2026-11-07", {
    "GET /api/bot/reorders": { items: [], skipped_repurchases: 0 },
  });
  assert.deepEqual(reorder.calls[0].query, { date_from: "2026-11-01", date_to: "2026-11-07", reminder: "last" });
  assert.match(reorder.replies[0].text, /Tidak ada customer/);
});

test("!updateproduct sends the product query in the body", async () => {
  const { calls, replies } = await run("!updateproduct reta 10 mg\nusage_life: 8 minggu\nprice: 1.75jt", {
    "PATCH /api/bot/products": {
      display_name: "Retatrutide 10mg", price: 1750000, usage_days: 56, product_type: "mainproduct",
      product_type_label: "mainproduct (Peptides)", previous: { price: 1700000, usage_days: 0, product_type: "mainproduct" },
    },
  });
  assert.deepEqual(calls[0].json, { query: "reta 10 mg", usage_life: "8 minggu", price: 1750000 });
  assert.match(replies[0].text, /Usage life: 0 → \*\*56 hari\*\*/);
});

test("only the finance commands are limited to the directors channel", () => {
  const directorsOnly = Object.keys(COMMAND_SPECS).filter((name) => COMMAND_SPECS[name].directorsOnly);
  assert.deepEqual(directorsOnly, ["!addexpense", "!reimbursement"]);
  assert.match(buildHelpIndex(COMMAND_SPECS), /\*\*Produk\*\*\n`!updateproduct <produk>`/);
});

test("!dailyreport shows every origin row", async () => {
  const byOrigin = { ads: { total: 2, hot: 1, warm: 1, cold: 0, skip: 0 } };
  const { replies } = await run("!dailyreport 2026-10-31", {
    "GET /api/bot/reports/daily": {
      date: "2026-10-31", total: 2, converted: 0, by_origin: byOrigin,
      by_status: { hot: 1, warm: 1, cold: 0, skip: 0 },
    },
  });
  for (const origin of ["ads", "tokopedia", "instagram", "threads", "tiktok", "fnf", "shopee", "website"]) {
    assert.match(replies[0].text, new RegExp(origin));
  }
  assert.match(replies[0].text, /Total lead baru: \*\*2\*\*/);
});

test("!help shows a copyable template", async () => {
  const { replies } = await run("!help invoice");
  assert.match(replies[0].text, /```\n!invoice\nlead: 081234567890/);
  await assert.rejects(run("!help nope"), /tidak ada/);
});
