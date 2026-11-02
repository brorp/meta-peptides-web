// Command specs (fields, help text) and their handlers.
import { AttachmentBuilder } from "discord.js";
import { buildCommandHelp, buildHelpIndex } from "./help.mjs";
import {
  CommandInputError,
  assertKnownFields,
  isValidDate,
  parseBoolean,
  parseDateArgs,
  parseInvoiceItems,
  parseMoney,
} from "./parser.mjs";
import {
  ORIGINS,
  STATUSES,
  STATUS_EMOJI,
  buildCustomerInvoiceText,
  buildShippingText,
  dash,
  dateRangeLabel,
  formatDateId,
  formatLeadCard,
  formatOrderLine,
  formatReorderSchedule,
  isMarketplaceOrder,
  jakartaDate,
  leadInterest,
  numbered,
  oneLine,
  orderTypeLabel,
  rupiah,
  statusLabel,
  waLink,
} from "./format.mjs";

const ORIGIN_TEXT = ORIGINS.join(" / ");
const STATUS_TEXT = STATUSES.join(" / ");
const REJECTION_TEXT = "harga / company / cara_penggunaan / perizinan / produk_tidak_ada / ghosting / - (kosong)";
const PAYMENT_TEXT = "Bank Transfer / QRIS / Shopee / Tokopedia";
const DATE_RANGE_ARGUMENT =
  "`<dari> <sampai>` format YYYY-MM-DD (boleh pakai `-` atau `sampai` di tengah). Satu tanggal = hari itu saja, kosong = hari ini";

// Filled when the lead is created with !newleads.
const NEW_LEAD_FIELDS = [
  { name: "wa", description: "Nomor WhatsApp. Boleh 08xx, 62xx, atau +62 xxx", example: "081234567890" },
  { name: "name", description: "Nama lead", example: "Budi Santoso" },
  { name: "origin", description: ORIGIN_TEXT, example: "ads" },
  { name: "status", description: STATUS_TEXT, example: "hot" },
  { name: "interest", description: "Produk yang diminati, boleh singkat: `reta 10 mg` → Retatrutide 10mg. `-` untuk kosong", example: "reta 10 mg" },
  { name: "rejection", description: `Alasan belum beli: ${REJECTION_TEXT}`, example: "-" },
  { name: "chat_date", description: "Tanggal mulai chat (YYYY-MM-DD). Boleh tidak ditulis: otomatis tanggal hari ini (WIB). Dasar hitungan !followup" },
];

// Only through !updateleads. is_customer starts as false (it becomes true
// after !invoice).
const UPDATE_ONLY_LEAD_FIELDS = [
  { name: "domicile", description: "Kota domisili", example: "Tangerang" },
  { name: "goal", description: "Tujuan pemakaian / keluhan", example: "turun berat badan 10 kg" },
  { name: "notes", description: "Catatan bebas, boleh lebih dari satu baris", example: "Tanya dosis, minta dikabari pas gajian" },
  { name: "is_customer", description: "true / false. Otomatis true setelah !invoice. Isi true kalau customer beli di luar !invoice supaya tidak muncul di !followup" },
];
const UPDATE_ONLY_FIELD_NAMES = UPDATE_ONLY_LEAD_FIELDS.map((field) => field.name);
const UPDATE_LEAD_EXAMPLES = { status: "warm", rejection: "harga" };
const UPDATE_LEAD_DESCRIPTIONS = {
  chat_date: "Koreksi tanggal mulai chat (YYYY-MM-DD). Mengubah jadwal !followup",
};

const required = (names, fields) =>
  fields.map((field) => ({ ...field, required: names.includes(field.name) }));

export const COMMAND_SPECS = {
  "!newleads": {
    group: "Leads",
    usage: "!newleads",
    summary: "Tambah lead baru dari chat WhatsApp",
    positional: false,
    fields: required(["wa", "name", "origin", "status"], NEW_LEAD_FIELDS),
    notes: [
      "chat_date boleh tidak ditulis: otomatis tanggal hari ini (WIB). Tulis `chat_date: YYYY-MM-DD` kalau lead sebenarnya mulai chat di hari lain.",
      "is_customer otomatis false (jadi true setelah !invoice).",
      "domicile, goal, dan notes diisi lewat !updateleads setelah lead dibuat.",
      "Satu nomor WA = satu lead. Kalau nomor sudah ada, pakai !updateleads.",
      "Kalau interest cocok ke beberapa produk (misal `reta`), tetap disimpan sebagai teks dan bot menampilkan pilihannya.",
    ],
    handler: handleNewLead,
  },
  "!updateleads": {
    group: "Leads",
    usage: "!updateleads <wa>",
    summary: "Ubah data lead, termasuk domicile, goal, dan notes (tulis hanya field yang berubah)",
    argument: "nomor WA lead (atau ID lead)",
    example: { firstLine: "!updateleads 081234567890" },
    fields: [
      ...NEW_LEAD_FIELDS.filter((field) => field.name !== "wa").map((field) => ({
        ...field,
        description: UPDATE_LEAD_DESCRIPTIONS[field.name] || field.description,
        example: UPDATE_LEAD_EXAMPLES[field.name],
      })),
      ...UPDATE_ONLY_LEAD_FIELDS,
      { name: "wa", description: "Ganti nomor WhatsApp lead" },
    ],
    freeText: ["notes", "goal"],
    notes: ["Minimal satu field. Field lain tidak berubah.", "`rejection: -`, `interest: -`, atau `notes: -` untuk mengosongkan."],
    handler: handleUpdateLead,
  },
  "!lead": {
    group: "Leads",
    usage: "!lead <wa>",
    summary: "Lihat data lead + 5 invoice terakhir",
    argument: "nomor WA lead (atau ID lead)",
    example: { firstLine: "!lead 081234567890" },
    fields: [],
    handler: handleLeadLookup,
  },
  "!followup": {
    group: "Leads",
    usage: "!followup <dari> <sampai>",
    summary: "Lead yang perlu di-follow up H+1, H+3, H+7 dari chat_date",
    argument: DATE_RANGE_ARGUMENT,
    example: { firstLine: "!followup 2026-11-01 2026-11-07" },
    fields: [],
    notes: [
      "Lead yang sudah is_customer = true (sudah beli) tidak muncul.",
      "Urutan: hot → warm → cold → skip. Nomor WA bisa diklik langsung.",
    ],
    handler: handleFollowup,
  },
  "!invoice": {
    group: "Order",
    usage: "!invoice",
    summary: "Closing: buat order + invoice PDF, potong stok, lead jadi customer",
    positional: false,
    fields: [
      { name: "lead", required: true, description: "Nomor WA lead (harus sudah dibuat dengan !newleads)", example: "081234567890" },
      { name: "address", required: true, description: "Alamat lengkap pengiriman", example: "Metland Puri Blok F5 No 21" },
      { name: "city", required: true, description: "Kota/kabupaten, provinsi", example: "Kota Tangerang, Banten" },
      { name: "zip", description: "Kode pos", example: "15147" },
      {
        name: "item",
        required: true,
        description: "`qty | produk` atau `qty | produk | harga custom`. Satu baris per produk, boleh banyak baris. Nama produk boleh singkat",
        example: ["2 | reta 10 mg", "1 | nad 1000"],
      },
      { name: "order_type", description: "`whatsapp` / `shopee` / `tokopedia` (sama dengan Order Source di panel). Default whatsapp", example: "whatsapp" },
      { name: "marketplace_fee", description: "Khusus shopee/tokopedia: total fee/potongan dari platform (angka). Mengurangi total order, sama seperti di panel. Default 0" },
      { name: "marketplace_order_no", description: "Khusus shopee/tokopedia: nomor pesanan dari Shopee/Tokopedia (opsional). Bisa dipakai untuk cari invoice, dan order dengan nomor yang sama ditolak supaya tidak dobel" },
      { name: "discount", description: "Khusus whatsapp: potongan dalam rupiah (angka). Default 0", example: "0" },
      { name: "payment_type", description: "Khusus whatsapp: Bank Transfer / QRIS. Default Bank Transfer. Order shopee/tokopedia otomatis Shopee/Tokopedia", example: "Bank Transfer" },
      { name: "notes", description: "Catatan internal (tidak tampil di invoice)", example: "Kirim sebelum jam 3" },
    ],
    freeText: ["notes", "address"],
    notes: [
      "Harga diambil dari harga produk saat ini, kecuali diisi harga custom. Harga 0 = gratis/bonus.",
      "Order Shopee/Tokopedia: ganti jadi `order_type: shopee` (atau `tokopedia`), tambah `marketplace_fee` (dan `marketplace_order_no` kalau ada), lalu hapus baris `discount` dan `payment_type`. Total = subtotal - marketplace_fee.",
      "Order Shopee/Tokopedia tidak dapat teks invoice WhatsApp, karena customer bayar dan dapat invoice dari marketplace. PDF tetap dikirim.",
      "Usage life tiap produk dicatat per item untuk reorder reminder (bisa beda-beda per produk).",
      "Output: PDF invoice (sama dengan panel) + teks invoice siap di-forward ke customer.",
    ],
    handler: handleInvoice,
  },
  "!payment": {
    group: "Order",
    usage: "!payment <invoice>",
    summary: "Catat pembayaran (wajib upload foto bukti bayar) + kirim packing slip",
    argument: "nomor invoice, contoh MW-20261031-01001",
    example: { firstLine: "!payment MW-20261031-01001" },
    fields: [
      { name: "amount", required: true, description: "Nominal yang dibayar customer", example: "5450000" },
      { name: "payment_type", required: true, description: PAYMENT_TEXT, example: "QRIS" },
      { name: "payment_date", description: "Tanggal bayar YYYY-MM-DD. Kosong = hari ini", example: "2026-10-31" },
    ],
    notes: [
      "Upload 1 gambar bukti bayar (JPG/PNG/WebP, maks 5 MB) di pesan yang sama dengan command. Tanpa gambar, command ditolak.",
      "Invoice yang sudah lunas atau dibatalkan tidak bisa dibayar lagi.",
      "Bot memberi peringatan kalau nominal beda dengan total invoice.",
    ],
    handler: handlePayment,
  },
  "!updateshipping": {
    group: "Order",
    usage: "!updateshipping <invoice>",
    summary: "Isi kurir, ongkir, dan nomor resi setelah barang dikirim",
    argument: "nomor invoice",
    example: { firstLine: "!updateshipping MW-20261031-01001" },
    fields: [
      { name: "shipment_type", required: true, description: "Kurir + layanan", example: "JNE REG" },
      { name: "shipping_fee", description: "Ongkir yang kita bayar (angka). Wajib untuk order WhatsApp: dicatat sebagai expense, tidak menambah total invoice. Order Shopee/Tokopedia boleh dikosongkan (ongkir diurus marketplace)", example: "25000" },
      { name: "tracking_number", required: true, description: "Nomor resi", example: "JP1234567890" },
    ],
    notes: ["Bot juga mengirim teks info resi siap di-forward ke customer."],
    handler: handleShipping,
  },
  "!getinvoice": {
    group: "Order",
    usage: "!getinvoice <invoice>",
    summary: "Kirim ulang PDF + teks invoice",
    argument: "nomor invoice",
    example: { firstLine: "!getinvoice MW-20261031-01001" },
    fields: [],
    handler: handleGetInvoice,
  },
  "!aftersales": {
    group: "Reminder",
    usage: "!aftersales <dari> <sampai>",
    summary: "Customer yang perlu dicek H+1, H+7, H+14 dari tanggal pembelian",
    argument: DATE_RANGE_ARGUMENT,
    example: { firstLine: "!aftersales 2026-11-01 2026-11-07" },
    fields: [],
    notes: [
      "Hanya order yang sudah lunas. Order Shopee/Tokopedia tidak ikut.",
      "Menampilkan sifat lead (status, origin, rejection, notes) dan produk yang dibeli.",
    ],
    handler: handleAftersales,
  },
  "!reorder": {
    group: "Reminder",
    usage: "!reorder <dari> <sampai>",
    summary: "Reminder reorder: tanggal order + usage_life tiap produk",
    argument: DATE_RANGE_ARGUMENT,
    example: { firstLine: "!reorder 2026-11-01 2026-11-07" },
    fields: [],
    notes: [
      "Dihitung per produk: beli Reta (8 minggu) + NAD (2 minggu) = dua reminder di tanggal berbeda.",
      "Produk misc (perintilan) dan produk tanpa usage_life tidak muncul.",
      "Otomatis dilewati kalau customer sudah beli produk yang sama lagi.",
    ],
    handler: (ctx) => handleReorder(ctx, "first"),
  },
  "!reorderlast": {
    group: "Reminder",
    usage: "!reorderlast <dari> <sampai>",
    summary: "Reminder reorder kedua: 3 hari setelah !reorder",
    argument: DATE_RANGE_ARGUMENT,
    example: { firstLine: "!reorderlast 2026-11-01 2026-11-07" },
    fields: [],
    notes: ["Aturan sama dengan !reorder, tapi due date = tanggal order + usage_life + 3 hari."],
    handler: (ctx) => handleReorder(ctx, "last"),
  },
  "!dailyreport": {
    group: "Report",
    usage: "!dailyreport <tanggal>",
    summary: "Jumlah lead baru per hari, per origin, dan per status",
    argument: "tanggal YYYY-MM-DD, kosong = hari ini",
    example: { firstLine: "!dailyreport 2026-10-31" },
    fields: [],
    notes: ["Lead dihitung berdasarkan chat_date."],
    handler: handleDailyReport,
  },
  "!updateproduct": {
    group: "Produk",
    usage: "!updateproduct <produk>",
    summary: "Ubah harga, usage_life, atau tipe produk",
    argument: "nama produk, boleh singkat (contoh: reta 10 mg)",
    example: { firstLine: "!updateproduct reta 10 mg" },
    fields: [
      { name: "price", description: "Harga jual baru (angka)", example: "1750000" },
      { name: "usage_life", description: "Masa pakai: `56 hari`, `8 minggu`, `8 weeks`, atau `2 bulan`", example: "8 minggu" },
      { name: "type", description: "mainproduct (peptides) / misc (perintilan, tanpa usage_life)", example: "mainproduct" },
    ],
    notes: [
      "Isi minimal satu field.",
      "price langsung mengubah harga jual di website dan harga default di !invoice. Untuk harga khusus satu customer, jangan ubah di sini: tulis harganya di baris item !invoice (contoh `item: 2 | reta 10 mg | 1700000`).",
      "type: misc otomatis membuat usage_life = 0.",
      "Kategori storefront (tag di website) tidak berubah.",
    ],
    handler: handleUpdateProduct,
  },
  "!addexpense": {
    group: "Direksi",
    usage: "!addexpense",
    summary: "Tambah expense (sama seperti form expense di panel)",
    directorsOnly: true,
    positional: false,
    fields: [
      { name: "title", required: true, description: "Nama pengeluaran", example: "Beli thermal label" },
      { name: "amount", required: true, description: "Nominal (angka)", example: "350000" },
      { name: "paid_by", required: true, description: "kas / rudi / rp", example: "rudi" },
      { name: "is_reimburse", required: true, description: "true kalau perlu diganti ke yang bayar (muncul di !reimbursement)", example: "true" },
      { name: "category", description: "Kategori. Default Operations", example: "Packaging" },
      { name: "expense_date", description: "Tanggal YYYY-MM-DD. Kosong = hari ini", example: "2026-10-31" },
      { name: "vendor", description: "Toko / vendor", example: "Toko ABC" },
      { name: "payment_method", description: "Cara bayar", example: "Transfer" },
      { name: "notes", description: "Catatan", example: "10 roll" },
    ],
    freeText: ["notes"],
    notes: ["paid_by kas tidak bisa is_reimburse true (uang kas tidak perlu diganti)."],
    handler: handleAddExpense,
  },
  "!reimbursement": {
    group: "Direksi",
    usage: "!reimbursement <dari> <sampai>",
    summary: "Daftar expense yang perlu di-reimburse + total per orang",
    directorsOnly: true,
    argument: DATE_RANGE_ARGUMENT,
    example: { firstLine: "!reimbursement 2026-10-01 2026-10-31" },
    fields: [],
    handler: handleReimbursement,
  },
  "!product": {
    group: "Bantuan",
    usage: "!product <produk>",
    summary: "Cek produk: hasil pencocokan nama, harga, stok, usage_life, tipe",
    argument: "nama produk, boleh singkat",
    example: { firstLine: "!product reta 10" },
    fields: [],
    handler: handleProduct,
  },
  "!help": {
    group: "Bantuan",
    usage: "!help <command>",
    summary: "Daftar command atau format lengkap satu command",
    example: { firstLine: "!help invoice" },
    fields: [],
    handler: handleHelp,
  },
};

export function getCommandSpec(command) {
  const spec = COMMAND_SPECS[command];
  if (!spec) return null;
  return {
    fields: (spec.fields || []).map((field) => field.name),
    freeText: spec.freeText || [],
    positional: spec.positional,
  };
}

// --- helpers -------------------------------------------------------------

function fieldNames(spec) {
  return (spec.fields || []).map((field) => field.name);
}

function checkFields(ctx, { requireAll = true } = {}) {
  const { parsed, spec, name } = ctx;
  assertKnownFields(parsed, fieldNames(spec), name);
  if (!requireAll) return;
  const missing = (spec.fields || [])
    .filter((field) => field.required && !String(parsed.get(field.name) || "").trim())
    .map((field) => field.name);
  if (missing.length) {
    throw new CommandInputError(
      `Field wajib belum diisi: ${missing.join(", ")}. Ketik \`!help ${name.slice(1)}\` untuk contoh.`,
    );
  }
}

function requireArgument(ctx, label) {
  if (!ctx.parsed.argumentText) {
    throw new CommandInputError(
      `Tulis ${label} setelah command. Contoh: \`${ctx.spec.example?.firstLine || ctx.spec.usage}\``,
    );
  }
  return ctx.parsed.argumentText;
}

function rejectArguments(ctx) {
  if (ctx.parsed.argumentText) {
    throw new CommandInputError(
      `${ctx.name} tidak memakai teks setelah nama command. Tulis data di baris baru (field: isi).`,
    );
  }
}

function pickFields(parsed, names) {
  const json = {};
  for (const name of names) {
    if (parsed.has(name)) json[name] = parsed.get(name);
  }
  return json;
}

function checkDateField(value, name) {
  if (value !== undefined && value !== "" && !isValidDate(value)) {
    throw new CommandInputError(`${name} harus format YYYY-MM-DD, contoh 2026-10-31.`);
  }
}

function interestWarningText(data) {
  if (!data.interest_warning) return "";
  const candidates = (data.interest_candidates || []).slice(0, 5);
  return `\n⚠️ ${data.interest_warning}${candidates.length ? `\nPilihan: ${candidates.join(" | ")}` : ""}`;
}

async function sendPdfReply(ctx, { content, path, type, fileName }) {
  const pdf = await ctx.api.file(path, { query: { type } });
  await ctx.reply(content, [new AttachmentBuilder(pdf, { name: fileName })]);
}

function invoiceSummary(order) {
  const marketplace = isMarketplaceOrder(order);
  const label = orderTypeLabel(order.order_source);
  const items = (order.order_items || [])
    .map((item) => `• ${item.quantity}x ${item.display_name} — ${Number(item.price_at_purchase) === 0 ? "GRATIS" : rupiah(item.quantity * item.price_at_purchase)}`)
    .join("\n");
  const totals = [`Subtotal ${rupiah(order.subtotal)}`];
  if (Number(order.voucher_discount_amount) > 0) totals.push(`Diskon -${rupiah(order.voucher_discount_amount)}`);
  if (Number(order.marketplace_fee) > 0) totals.push(`Fee ${label} -${rupiah(order.marketplace_fee)}`);
  totals.push(`**Total${marketplace ? " bersih" : ""} ${rupiah(order.total_price)}**`);
  const orderNo =
    marketplace && order.manual_reference && order.manual_reference !== order.invoice_number
      ? ` • No. pesanan ${order.manual_reference}`
      : "";
  return [
    `Customer: **${order.shipping_name}** • ${waLink(order.shipping_phone)}`,
    items,
    totals.join(" • "),
    `${marketplace ? `Order ${label}${orderNo} • ` : ""}Pembayaran: ${order.payment?.payment_type || "-"} • ${order.is_paid ? "LUNAS ✅" : "BELUM DIBAYAR"}`,
  ].join("\n");
}

// Marketplace customers pay and get their invoice inside Shopee/Tokopedia.
function customerTextNote(order) {
  if (!isMarketplaceOrder(order)) return "👇 Teks invoice untuk di-forward ke customer ada di pesan berikut.";
  const label = orderTypeLabel(order.order_source);
  return `ℹ️ Order ${label}: customer bayar dan dapat invoice dari ${label}, jadi teks invoice WhatsApp tidak dikirim.`;
}

// --- handlers ------------------------------------------------------------

async function handleNewLead(ctx) {
  rejectArguments(ctx);
  const { parsed } = ctx;

  // Clear guidance instead of the generic "unknown field" error.
  const misplaced = parsed.keys.filter((key) => UPDATE_ONLY_FIELD_NAMES.includes(key));
  if (misplaced.length) {
    const hints = [];
    const laterFields = misplaced.filter((key) => key !== "is_customer");
    if (laterFields.length) {
      hints.push(`${laterFields.join(", ")} diisi lewat \`!updateleads <wa>\` setelah lead dibuat.`);
    }
    if (misplaced.includes("is_customer")) {
      hints.push("is_customer otomatis false (jadi true setelah !invoice), tidak perlu ditulis.");
    }
    throw new CommandInputError(
      `Hapus baris ${misplaced.join(", ")} dari !newleads.\n${hints.join("\n")}`,
    );
  }
  checkFields(ctx);
  checkDateField(parsed.get("chat_date"), "chat_date");

  const json = pickFields(parsed, NEW_LEAD_FIELDS.map((field) => field.name));
  const data = await ctx.api.post("/api/bot/leads", json);
  await ctx.reply(
    `✅ **Lead baru tersimpan**\n${formatLeadCard(data.lead)}${interestWarningText(data)}\n` +
      `Tambah domicile/goal/notes: \`!updateleads ${data.lead.whatsapp_phone}\``,
  );
}

async function handleUpdateLead(ctx) {
  const identifier = requireArgument(ctx, "nomor WA lead");
  checkFields(ctx, { requireAll: false });
  const { parsed } = ctx;
  if (!parsed.keys.length) {
    throw new CommandInputError("Tulis minimal satu field yang mau diubah di baris baru, contoh:\n`status: warm`");
  }
  checkDateField(parsed.get("chat_date"), "chat_date");

  const json = pickFields(parsed, ["wa", "name", "origin", "status", "interest", "rejection", "chat_date", "domicile", "goal", "notes"]);
  if (parsed.has("is_customer")) json.is_customer = parseBoolean(parsed.get("is_customer"), "is_customer");

  const data = await ctx.api.patch(`/api/bot/leads/${encodeURIComponent(identifier)}`, json);
  await ctx.reply(
    `✅ **Lead diupdate** (${data.changed_fields.join(", ")})\n${formatLeadCard(data.lead)}${interestWarningText(data)}`,
  );
}

async function handleLeadLookup(ctx) {
  const identifier = requireArgument(ctx, "nomor WA lead");
  checkFields(ctx, { requireAll: false });
  const data = await ctx.api.get(`/api/bot/leads/${encodeURIComponent(identifier)}`);
  const orders = data.orders.length
    ? data.orders
        .map((order) => `• ${order.invoice_number || order.id.slice(0, 8)} • ${jakartaDate(order.created_at)} • ${rupiah(order.total_price)} • ${order.status === "cancelled" ? "BATAL" : order.is_paid ? "lunas" : "belum bayar"}${order.tracking_number ? ` • resi ${order.tracking_number}` : ""}`)
        .join("\n")
    : "Belum ada invoice.";
  await ctx.reply(`${formatLeadCard(data.lead)}\n\n**Invoice terakhir**\n${orders}`);
}

async function handleFollowup(ctx) {
  checkFields(ctx, { requireAll: false });
  const { dateFrom, dateTo } = parseDateArgs(ctx.parsed.args);
  const data = await ctx.api.get("/api/bot/followups", { query: { date_from: dateFrom, date_to: dateTo } });

  const sections = [`**📞 Follow up leads — ${dateRangeLabel(dateFrom, dateTo)}**`];
  for (const [key, label] of [["h1", "H+1"], ["h3", "H+3"], ["h7", "H+7"]]) {
    const leads = data.groups[key] || [];
    sections.push(`**${label} (${leads.length})**${leads.length ? "" : " — tidak ada"}`);
    sections.push(
      ...numbered(leads, (lead) =>
        [
          `**${lead.full_name}** • ${waLink(lead.whatsapp_phone)} • ${statusLabel(lead.status)}`,
          `Due ${lead.due_date} • chat ${lead.chat_date} • ${lead.origin} • PIC ${dash(lead.discord_username)}`,
          `Interest: ${leadInterest(lead)} • Rejection: ${dash(lead.rejection)}`,
          `Notes: ${oneLine(lead.notes)}${lead.goal ? ` • Goal: ${oneLine(lead.goal, 80)}` : ""}`,
        ].join("\n"),
      ),
    );
  }
  await ctx.send(sections.join("\n\n"));
}

async function handleInvoice(ctx) {
  rejectArguments(ctx);
  checkFields(ctx);
  const { parsed } = ctx;
  const json = {
    lead: parsed.get("lead"),
    address: parsed.get("address"),
    city: parsed.get("city"),
    zip: parsed.get("zip"),
    items: parseInvoiceItems(parsed.getAll("item")),
    order_type: parsed.get("order_type"),
    marketplace_fee: parseMoney(parsed.get("marketplace_fee"), "marketplace_fee"),
    marketplace_order_no: parsed.get("marketplace_order_no"),
    discount: parseMoney(parsed.get("discount"), "discount") ?? 0,
    // Left out when not written: the API picks Bank Transfer, or Shopee/Tokopedia
    // for marketplace orders.
    payment_type: parsed.get("payment_type"),
    notes: parsed.get("notes"),
  };

  const order = await ctx.api.post("/api/bot/invoices", json);
  const reference = order.invoice_number || order.id;
  const marketplace = isMarketplaceOrder(order);
  const schedule = formatReorderSchedule(order);
  await sendPdfReply(ctx, {
    path: `/api/bot/orders/${encodeURIComponent(reference)}/pdf`,
    type: "invoice",
    fileName: `invoice-${reference}.pdf`,
    content: [
      order.duplicate
        ? `ℹ️ Invoice **${reference}** sudah dibuat dari pesan ini sebelumnya.`
        : `✅ **Invoice ${reference} dibuat**${marketplace ? ` (order ${orderTypeLabel(order.order_source)})` : ""} • stok dipotong • lead ditandai customer`,
      invoiceSummary(order),
      schedule,
      customerTextNote(order),
    ].filter(Boolean).join("\n\n"),
  });
  if (!marketplace) await ctx.sendPlain(buildCustomerInvoiceText(order, ctx.config));
}

async function handlePayment(ctx) {
  const identifier = requireArgument(ctx, "nomor invoice");
  checkFields(ctx);
  const { parsed, message } = ctx;
  checkDateField(parsed.get("payment_date"), "payment_date");

  const proof = message.attachments.find((attachment) =>
    String(attachment.contentType || "").startsWith("image/"),
  );
  if (!proof) {
    throw new CommandInputError("Upload foto bukti pembayaran di pesan yang sama dengan command !payment.");
  }

  const order = await ctx.api.post(`/api/bot/orders/${encodeURIComponent(identifier)}/payment`, {
    amount: parseMoney(parsed.get("amount"), "amount"),
    payment_type: parsed.get("payment_type"),
    payment_date: parsed.get("payment_date"),
    proof_url: proof.url,
    proof_content_type: String(proof.contentType || "").split(";")[0],
    proof_size: proof.size,
  });

  const reference = order.invoice_number || order.id;
  const payment = order.payment || {};
  const difference = Number(order.payment_difference || 0);
  // Marketplace totals are net of the platform fee; the price before the fee
  // is also a correct amount to record.
  const grossAmount = Number(order.subtotal || 0) - Number(order.voucher_discount_amount || 0);
  const paidGross =
    isMarketplaceOrder(order) &&
    Number(order.marketplace_fee) > 0 &&
    Number(payment.payment_amount) === grossAmount;
  const differenceText = order.duplicate
    ? "ℹ️ Pembayaran ini sudah tercatat sebelumnya dari pesan yang sama."
    : difference === 0
      ? "Nominal sesuai total invoice ✅"
      : paidGross
        ? `Nominal sesuai harga sebelum fee ${orderTypeLabel(order.order_source)} ✅ (total bersih setelah fee ${rupiah(order.total_price)})`
        : difference < 0
        ? `⚠️ **Kurang bayar ${rupiah(-difference)}** dari total ${rupiah(order.total_price)}.`
        : `⚠️ **Lebih bayar ${rupiah(difference)}** dari total ${rupiah(order.total_price)}.`;

  await sendPdfReply(ctx, {
    path: `/api/bot/orders/${encodeURIComponent(reference)}/pdf`,
    type: "packing-slip",
    fileName: `packing-slip-${reference}.pdf`,
    content: [
      `💰 **Pembayaran ${reference} dicatat** — ${rupiah(payment.payment_amount)} via ${payment.payment_type} (${formatDateId(jakartaDate(payment.payment_date))})`,
      `Customer: **${order.shipping_name}** • ${waLink(order.shipping_phone)}`,
      differenceText,
      "📦 Packing slip terlampir untuk gudang.",
    ].join("\n"),
  });
}

async function handleShipping(ctx) {
  const identifier = requireArgument(ctx, "nomor invoice");
  checkFields(ctx);
  const { parsed } = ctx;
  const order = await ctx.api.patch(`/api/bot/orders/${encodeURIComponent(identifier)}/shipping`, {
    shipment_type: parsed.get("shipment_type"),
    shipping_fee: parseMoney(parsed.get("shipping_fee"), "shipping_fee"),
    tracking_number: parsed.get("tracking_number"),
  });

  const reference = order.invoice_number || order.id;
  const fee = Number(order.shipping_fee || 0);
  const label = orderTypeLabel(order.order_source);
  const feeText = isMarketplaceOrder(order)
    ? fee > 0
      ? `Ongkir: ${rupiah(fee)} (order ${label}, tidak dicatat sebagai expense)`
      : `Ongkir: diurus ${label}`
    : `Ongkir: ${rupiah(fee)}${order.shipping_expense_recorded ? " (dicatat sebagai expense)" : ""}`;
  await ctx.reply(
    [
      `🚚 **Pengiriman ${reference} diupdate**`,
      `Kurir: ${order.shipment_type} • ${feeText} • Resi: **${order.tracking_number}**`,
      order.previous_tracking_number && order.previous_tracking_number !== order.tracking_number
        ? `Resi sebelumnya: ${order.previous_tracking_number}`
        : null,
      order.is_paid ? null : "⚠️ Invoice ini belum tercatat lunas.",
      "👇 Teks info resi untuk customer ada di pesan berikut.",
    ].filter(Boolean).join("\n"),
  );
  await ctx.sendPlain(buildShippingText(order, ctx.config));
}

async function handleGetInvoice(ctx) {
  const identifier = requireArgument(ctx, "nomor invoice");
  checkFields(ctx, { requireAll: false });
  const order = await ctx.api.get(`/api/bot/orders/${encodeURIComponent(identifier)}`);
  const reference = order.invoice_number || order.id;
  await sendPdfReply(ctx, {
    path: `/api/bot/orders/${encodeURIComponent(reference)}/pdf`,
    type: "invoice",
    fileName: `invoice-${reference}.pdf`,
    content: [
      `🧾 **Invoice ${reference}**${order.status === "cancelled" ? " (DIBATALKAN)" : ""}`,
      invoiceSummary(order),
      order.tracking_number ? `Resi: ${order.shipment_type || "-"} ${order.tracking_number}` : null,
      formatReorderSchedule(order),
      customerTextNote(order),
    ].filter(Boolean).join("\n\n"),
  });
  if (!isMarketplaceOrder(order)) await ctx.sendPlain(buildCustomerInvoiceText(order, ctx.config));
}

async function handleAftersales(ctx) {
  checkFields(ctx, { requireAll: false });
  const { dateFrom, dateTo } = parseDateArgs(ctx.parsed.args);
  const data = await ctx.api.get("/api/bot/aftersales", { query: { date_from: dateFrom, date_to: dateTo } });

  const sections = [`**🤝 Aftersales — ${dateRangeLabel(dateFrom, dateTo)}**`];
  for (const [key, label] of [["h1", "H+1"], ["h7", "H+7"], ["h14", "H+14"]]) {
    const entries = data.groups[key] || [];
    sections.push(`**${label} (${entries.length})**${entries.length ? "" : " — tidak ada"}`);
    sections.push(...numbered(entries, (entry) => formatOrderLine(entry)));
  }
  await ctx.send(sections.join("\n\n"));
}

async function handleReorder(ctx, reminder) {
  checkFields(ctx, { requireAll: false });
  const { dateFrom, dateTo } = parseDateArgs(ctx.parsed.args);
  const data = await ctx.api.get("/api/bot/reorders", {
    query: { date_from: dateFrom, date_to: dateTo, reminder },
  });

  const title = reminder === "last" ? "🔁 Reorder reminder KEDUA (+3 hari)" : "🔁 Reorder reminder";
  const sections = [`**${title} — ${dateRangeLabel(dateFrom, dateTo)} (${data.items.length})**`];
  if (!data.items.length) sections.push("Tidak ada customer yang jatuh tempo reorder.");
  sections.push(...numbered(data.items, (entry) => formatOrderLine(entry, { showUsage: true })));
  if (data.skipped_repurchases) {
    sections.push(`ℹ️ ${data.skipped_repurchases} produk dilewati karena customer sudah beli lagi.`);
  }
  await ctx.send(sections.join("\n\n"));
}

async function handleDailyReport(ctx) {
  checkFields(ctx, { requireAll: false });
  const { dateFrom } = parseDateArgs(ctx.parsed.args.slice(0, 1));
  if (ctx.parsed.args.length > 1) throw new CommandInputError("!dailyreport hanya memakai satu tanggal.");
  const data = await ctx.api.get("/api/bot/reports/daily", { query: { date: dateFrom } });

  const originLines = ORIGINS.map((origin) => {
    const row = data.by_origin[origin] || { total: 0 };
    const breakdown = STATUSES.map((status) => `${STATUS_EMOJI[status]}${row[status] || 0}`).join(" ");
    return `\`${origin.padEnd(9)}\` **${row.total}**  (${breakdown})`;
  });
  const statusLine = STATUSES.map((status) => `${STATUS_EMOJI[status]} ${status}: **${data.by_status[status] || 0}**`).join(" • ");

  await ctx.reply(
    [
      `**📊 Daily report leads — ${formatDateId(data.date)}**`,
      `Total lead baru: **${data.total}**${data.converted ? ` (sudah closing: ${data.converted})` : ""}`,
      "",
      "**Per origin** (🔥hot 🌤️warm ❄️cold ⏭️skip)",
      ...originLines,
      "",
      "**Per status**",
      statusLine,
    ].join("\n"),
  );
}

async function handleAddExpense(ctx) {
  rejectArguments(ctx);
  checkFields(ctx);
  const { parsed } = ctx;
  checkDateField(parsed.get("expense_date"), "expense_date");

  const expense = await ctx.api.post("/api/bot/expenses", {
    ...pickFields(parsed, ["title", "category", "expense_date", "vendor", "payment_method", "paid_by", "notes"]),
    amount: parseMoney(parsed.get("amount"), "amount"),
    is_reimburse: parseBoolean(parsed.get("is_reimburse"), "is_reimburse"),
  });

  await ctx.reply(
    `✅ **Expense tersimpan**: ${expense.title} — ${rupiah(expense.amount)}\n` +
      `Tanggal ${expense.expense_date} • Kategori ${expense.category} • Dibayar ${expense.paid_by} • Reimburse: ${expense.is_reimburse ? "ya" : "tidak"}`,
  );
}

async function handleReimbursement(ctx) {
  checkFields(ctx, { requireAll: false });
  const { dateFrom, dateTo } = parseDateArgs(ctx.parsed.args);
  const data = await ctx.api.get("/api/bot/reimbursements", { query: { date_from: dateFrom, date_to: dateTo } });

  const counts = {};
  for (const item of data.items) counts[item.paid_by] = (counts[item.paid_by] || 0) + 1;
  const totals = Object.entries(data.totals_by_paid_by)
    .filter(([paidBy, amount]) => amount > 0 || paidBy !== "kas")
    .map(([paidBy, amount]) => `${paidBy}: **${rupiah(amount)}** (${counts[paidBy] || 0} item)`);
  const details = data.items.map(
    (item) => `• ${item.expense_date} • ${item.title} • ${rupiah(item.amount)} • ${item.paid_by || "-"}${item.vendor ? ` • ${item.vendor}` : ""}`,
  );

  await ctx.send(
    [
      `**💸 Reimbursement — ${dateRangeLabel(dateFrom, dateTo)}**`,
      ...totals,
      `**Total: ${rupiah(data.total)}**`,
      "",
      details.length ? "**Detail**" : "Tidak ada expense yang perlu di-reimburse.",
      ...details,
    ].join("\n"),
  );
}

async function handleUpdateProduct(ctx) {
  const query = requireArgument(ctx, "nama produk");
  checkFields(ctx, { requireAll: false });
  const { parsed } = ctx;
  if (!parsed.keys.length) {
    throw new CommandInputError("Isi minimal satu field: price, usage_life, atau type. Contoh:\n`usage_life: 8 minggu`");
  }

  const json = { query };
  if (parsed.has("price")) json.price = parseMoney(parsed.get("price"), "price");
  if (parsed.has("usage_life")) json.usage_life = parsed.get("usage_life");
  if (parsed.has("type")) json.type = parsed.get("type");

  const product = await ctx.api.patch("/api/bot/products", json);
  const before = product.previous || {};
  const changes = [];
  if (json.price !== undefined) changes.push(`Harga: ${rupiah(before.price)} → **${rupiah(product.price)}**`);
  if (json.usage_life !== undefined || before.usage_days !== product.usage_days) {
    changes.push(`Usage life: ${before.usage_days} → **${product.usage_days} hari**`);
  }
  if (json.type !== undefined) changes.push(`Tipe: ${before.product_type} → **${product.product_type_label}**`);

  await ctx.reply(`✅ **${product.display_name}** diupdate\n${changes.join("\n")}`);
}

async function handleProduct(ctx) {
  const query = requireArgument(ctx, "nama produk");
  checkFields(ctx, { requireAll: false });
  const product = await ctx.api.get("/api/bot/products", { query: { query } });
  await ctx.reply(
    [
      `📦 **${product.display_name}**${product.label ? ` (${product.label})` : ""}${product.is_active ? "" : " — ⛔ NONAKTIF"}`,
      `Harga: ${rupiah(product.price)} • Stok: ${product.stock}`,
      `Tipe: ${product.product_type_label} • Usage life: ${product.product_type === "misc" ? "-" : product.usage_days ? `${product.usage_days} hari` : "⚠️ belum diisi"}`,
    ].join("\n"),
  );
}

async function handleHelp(ctx) {
  const key = String(ctx.parsed.args[0] || "").toLowerCase().replace(/^!?/, "!");
  if (key === "!") {
    await ctx.send(buildHelpIndex(COMMAND_SPECS));
    return;
  }
  const spec = COMMAND_SPECS[key];
  if (!spec) throw new CommandInputError(`Command ${key} tidak ada. Ketik !help untuk daftar command.`);
  await ctx.send(buildCommandHelp(key, spec));
}
