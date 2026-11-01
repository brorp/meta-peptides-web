// Text formatting for Discord replies and customer-facing (WhatsApp) text.

export const STATUS_EMOJI = { hot: "🔥", warm: "🌤️", cold: "❄️", skip: "⏭️" };
export const ORIGINS = ["ads", "tokopedia", "instagram", "threads", "tiktok", "fnf", "shopee", "website"];
export const STATUSES = ["hot", "warm", "cold", "skip"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function rupiah(value) {
  const amount = Math.round(Number(value || 0));
  const sign = amount < 0 ? "-" : "";
  return `${sign}Rp${Math.abs(amount).toLocaleString("id-ID")}`;
}

export function formatDateId(value) {
  const text = String(value || "").slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value || "-";
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

// Calendar date in Jakarta for a timestamp (timestamps are stored in UTC).
export function jakartaDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dateRangeLabel(from, to) {
  return from === to ? formatDateId(from) : `${formatDateId(from)} – ${formatDateId(to)}`;
}

// Clickable WhatsApp link without a Discord embed preview.
export function waLink(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `<https://wa.me/${digits}>` : "-";
}

export function statusLabel(status) {
  return status ? `${STATUS_EMOJI[status] || ""} ${status}`.trim() : "-";
}

export function dash(value) {
  const text = String(value ?? "").trim();
  return text || "-";
}

export function oneLine(value, max = 160) {
  const text = dash(value).replace(/\s*\n\s*/g, " / ");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function productLabel(product) {
  if (!product) return null;
  const name = String(product.name || "").trim();
  const volume = String(product.volume || "").trim();
  if (!volume) return name;
  const compact = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return compact(name).includes(compact(volume)) ? name : `${name} ${volume}`;
}

export function leadInterest(lead) {
  return productLabel(lead?.product) || lead?.interest_text || "-";
}

export function formatLeadCard(lead) {
  const lines = [
    `**${lead.full_name}** • ${waLink(lead.whatsapp_phone)} • ${statusLabel(lead.status)}`,
    `Origin: ${lead.origin} • Chat: ${lead.chat_date} • Customer: ${lead.is_customer ? "ya ✅" : "belum"}`,
    `Interest: ${leadInterest(lead)} • Rejection: ${dash(lead.rejection)}`,
  ];
  if (lead.domicile || lead.goal) {
    lines.push(`Domisili: ${dash(lead.domicile)} • Goal: ${oneLine(lead.goal, 80)}`);
  }
  if (lead.notes) lines.push(`Notes: ${oneLine(lead.notes, 300)}`);
  lines.push(`PIC: ${dash(lead.discord_username)}`);
  return lines.join("\n");
}

function itemLine(item) {
  const price = Number(item.price_at_purchase || 0);
  if (price === 0) return `   ${item.quantity} x GRATIS`;
  return `   ${item.quantity} x ${rupiah(price)} = ${rupiah(price * item.quantity)}`;
}

// Plain text the team can copy straight into WhatsApp (*bold* is WhatsApp
// formatting). Sent as its own message so "Copy Text" copies only this.
const ORDER_TYPE_LABELS = {
  manual_whatsapp: "WhatsApp",
  shopee: "Shopee",
  tokopedia: "Tokopedia",
  checkout: "Website",
};

export function orderTypeLabel(source) {
  return ORDER_TYPE_LABELS[source] || source || "-";
}

// Shopee/Tokopedia orders: the customer pays and gets invoiced in the marketplace.
export function isMarketplaceOrder(order) {
  return order?.order_source === "shopee" || order?.order_source === "tokopedia";
}

export function buildCustomerInvoiceText(order, { brandName, paymentInfo } = {}) {
  const discount = Number(order.voucher_discount_amount || 0);
  const address = [order.shipping_address, order.shipping_regional, order.shipping_zip]
    .filter(Boolean)
    .join(", ");
  const lines = [
    `*INVOICE ${order.invoice_number || order.id}*`,
    brandName || "MetaPeptides",
    "",
    `Tanggal: ${formatDateId(order.order_date)}`,
    `Nama: ${order.shipping_name}`,
    `No. WA: ${order.shipping_phone}`,
    `Alamat: ${address || "-"}`,
    "",
    "*Detail Pesanan*",
  ];

  (order.order_items || []).forEach((item, index) => {
    lines.push(`${index + 1}. ${item.display_name || productLabel(item.products) || "Produk"}`);
    lines.push(itemLine(item));
  });

  lines.push("", `Subtotal: ${rupiah(order.subtotal)}`);
  if (discount > 0) lines.push(`Diskon: -${rupiah(discount)}`);
  lines.push(`*Total: ${rupiah(order.total_price)}*`, "");
  lines.push(`Metode pembayaran: ${order.payment?.payment_type || "-"}`);
  lines.push(`Status: ${order.is_paid ? "LUNAS ✅" : "MENUNGGU PEMBAYARAN"}`);

  if (!order.is_paid && paymentInfo) lines.push("", paymentInfo);
  lines.push("", `Terima kasih sudah order di ${brandName || "MetaPeptides"} 🙏`);
  return lines.join("\n");
}

export function buildShippingText(order, { brandName } = {}) {
  return [
    `Halo kak ${order.shipping_name} 👋`,
    "",
    `Pesanan *${order.invoice_number || order.id}* sudah dikirim.`,
    `Kurir: ${order.shipment_type}`,
    `No. resi: *${order.tracking_number}*`,
    "",
    `Terima kasih sudah order di ${brandName || "MetaPeptides"} 🙏`,
  ].join("\n");
}

// Internal summary of reorder dates captured on an invoice.
export function formatReorderSchedule(order) {
  const scheduled = (order.order_items || []).filter((item) => item.reorder_date);
  const missing = (order.order_items || []).filter((item) => item.missing_usage_life);
  const lines = [];

  if (scheduled.length) {
    lines.push("🔁 **Jadwal reorder reminder** (tgl order + usage_life):");
    for (const item of scheduled) {
      lines.push(
        `• ${item.display_name} → ${formatDateId(item.reorder_date)} (${item.effective_usage_days} hari, reminder kedua +3 hari)`,
      );
    }
  }
  if (missing.length) {
    lines.push(
      `⚠️ Belum ada usage_life: ${missing.map((item) => item.display_name).join(", ")}. Isi lewat !updateproduct supaya reorder reminder muncul.`,
    );
  }
  return lines.join("\n");
}

export function formatOrderLine(entry, { showUsage = false } = {}) {
  const lead = entry.lead;
  const items = (entry.items || [])
    .map((item) =>
      showUsage
        ? `${item.name} x${item.quantity} (usage ${item.usage_days} hari)`
        : `${item.name} x${item.quantity}`,
    )
    .join(", ");
  const lines = [
    `**${entry.customer?.name || "-"}** • ${waLink(entry.customer?.phone)} • due ${entry.due_date}`,
    `Beli: ${items || "-"}`,
    `Invoice ${entry.invoice_number}${isMarketplaceOrder(entry) ? ` (${orderTypeLabel(entry.order_source)})` : ""} • order ${entry.order_date}${entry.tracking_number ? ` • resi ${entry.tracking_number}` : ""}`,
  ];
  if (lead) {
    lines.push(
      `Lead: ${statusLabel(lead.status)} • ${lead.origin} • rejection ${dash(lead.rejection)} • PIC ${dash(lead.pic)}`,
      `Notes: ${oneLine(lead.notes)}${lead.goal ? ` • Goal: ${oneLine(lead.goal, 80)}` : ""}`,
    );
  } else {
    lines.push(`Sumber order: ${entry.order_source} (bukan dari !invoice, tanpa data lead)`);
  }
  return lines.join("\n");
}

// Splits long text into Discord-sized messages (limit 2000), preferring
// breaks between blocks, then between lines.
export function splitMessage(text, limit = 1900) {
  const chunks = [];
  let current = "";
  const push = (piece, separator) => {
    if (!current) {
      current = piece;
    } else if (`${current}${separator}${piece}`.length <= limit) {
      current = `${current}${separator}${piece}`;
    } else {
      chunks.push(current);
      current = piece;
    }
  };

  for (const block of String(text || "-").split("\n\n")) {
    if (block.length <= limit) {
      push(block, "\n\n");
      continue;
    }
    for (const line of block.split("\n")) {
      if (line.length <= limit) {
        push(line, "\n");
        continue;
      }
      for (let start = 0; start < line.length; start += limit) {
        push(line.slice(start, start + limit), "\n");
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function numbered(entries, render) {
  return entries.map((entry, index) => {
    const [first, ...rest] = render(entry).split("\n");
    return [`${index + 1}. ${first}`, ...rest.map((line) => `    ${line}`)].join("\n");
  });
}
