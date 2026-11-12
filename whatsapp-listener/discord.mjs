// Posts to the Discord channel through a webhook (DISCORD_WA_WEBHOOK_URL).
// Mentions are always disabled: names and texts come from customers.

export function isDiscordWebhookUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" &&
      ["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"].includes(url.hostname) &&
      url.pathname.startsWith("/api/webhooks/");
  } catch {
    return false;
  }
}

// Customer text must not turn into Discord formatting, links, or a fake card.
export function escapeDiscord(value, max = 200) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const clipped = text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
  return clipped
    .replace(/([\\*_~`|>\[\]()<@])/g, "\\$1")
    // A leading # or - would become a heading or a list item.
    .replace(/^([#-])/, "\\$1");
}

const MESSAGE_LABEL = {
  image: "📷 gambar",
  video: "🎥 video",
  audio: "🎤 voice note",
  document: "📄 dokumen",
  sticker: "sticker",
  location: "📍 lokasi",
  contact: "👤 kontak",
  other: "pesan",
};

export function leadCardText(result, payload) {
  const lead = result.lead || {};
  const phone = String(lead.whatsapp_phone || payload.phone);
  const preview = payload.text
    ? escapeDiscord(payload.text)
    : `_(${MESSAGE_LABEL[payload.message_type] || "pesan"})_`;
  const name = escapeDiscord(lead.full_name, 80);
  const link = `[${phone}](<https://wa.me/${phone}>)`;
  if (result.action === "lead_created_existing_customer") {
    return [
      `🔁 **Customer lama chat lagi** • ${escapeDiscord(result.existing_customer || "sudah pernah order", 120)}`,
      `**${name}** • ${link} • origin **${lead.origin}** • lead dibuat dari data lama`,
      `> ${preview}`,
    ].join("\n");
  }
  const origin = lead.origin === "unknown" ? "**unknown** (isi lewat !updateleads)" : `**${lead.origin}**`;
  return [
    `🆕 **Lead baru dari WhatsApp** • ⏳ belum dianalisa`,
    `**${name}** • ${link} • origin ${origin} • status ${lead.status}`,
    `> ${preview}`,
    `Koreksi kalau perlu: \`!updateleads ${phone}\` lalu \`name:\` / \`origin:\` / \`status:\``,
  ].join("\n");
}

export async function postDiscord(webhookUrl, content, { fetchImpl = fetch, username = "WhatsApp Leads" } = {}) {
  if (!isDiscordWebhookUrl(webhookUrl)) return false;
  try {
    const response = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.slice(0, 1900),
        username,
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const STATUS_EMOJI = { hot: "🔥", warm: "🌤️", cold: "❄️", skip: "⏭️" };
const CONFIDENCE_TEXT = { high: "yakin", medium: "cukup yakin", low: "ragu" };
const statusText = (status) => (status ? `${STATUS_EMOJI[status] || ""} ${status}`.trim() : "-");
const formatTokens = (value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value));

// Splits lines into Discord messages of at most `max` characters.
export function packMessages(lines, max = 1900) {
  const messages = [];
  let current = "";
  for (const line of lines) {
    const piece = line.length > max ? `${line.slice(0, max - 1)}…` : line;
    if (current && current.length + 1 + piece.length > max) {
      messages.push(current);
      current = piece;
    } else {
      current = current ? `${current}\n${piece}` : piece;
    }
  }
  if (current) messages.push(current);
  return messages;
}

// The 12.00 / 23.00 digest. Returns [] when there is nothing to tell.
export function analysisDigest(run, slot) {
  const items = run.items || [];
  const ghosted = run.ghosted || [];
  const suggested = items.filter((item) => item.result === "suggested");
  const unchanged = items.filter((item) => item.result === "no_change").length;
  const thin = items.filter((item) => item.result === "not_enough_info").length;
  const refused = items.filter((item) => item.result === "refusal");
  const failed = items.filter((item) => item.result === "error");
  if (!items.length && !ghosted.length && !run.error) return [];

  const tokensIn = items.reduce((sum, item) => sum + (item.input_tokens || 0), 0);
  const tokensOut = items.reduce((sum, item) => sum + (item.output_tokens || 0), 0);
  const lines = [
    `🧠 **Analisa chat ${slot}** • ${items.length} lead dibaca • ${suggested.length} usulan${ghosted.length ? ` • ${ghosted.length} ghosting` : ""}`,
  ];
  for (const item of suggested) {
    const phone = String(item.whatsapp_phone || "");
    const status = item.status && item.status !== item.current_status
      ? `${statusText(item.current_status)} → **${statusText(item.status)}**`
      : statusText(item.current_status);
    const details = [
      item.interest && `minat ${escapeDiscord(item.interest, 60)}`,
      item.rejection && `alasan ${item.rejection}`,
      item.goal && `goal ${escapeDiscord(item.goal, 60)}`,
      item.domicile && `domisili ${escapeDiscord(item.domicile, 40)}`,
    ].filter(Boolean);
    lines.push("");
    lines.push(`**${escapeDiscord(item.full_name, 60)}** · [${phone}](<https://wa.me/${phone}>) · ${status} · ${CONFIDENCE_TEXT[item.confidence] || item.confidence}`);
    if (details.length) lines.push(details.join(" · "));
    if (item.evidence) lines.push(`> ${escapeDiscord(item.evidence, 150)}`);
    const waiting = (item.changes || []).filter((field) => !(item.applied || []).includes(field));
    const auto = item.applied?.length ? `✅ diterapkan otomatis (${item.applied.join(", ")})` : "";
    lines.push([auto, waiting.length ? `\`!applyai ${phone}\`${auto ? ` untuk ${waiting.join(", ")}` : ""}` : ""].filter(Boolean).join(" · "));
  }
  if (ghosted.length) {
    lines.push("");
    lines.push(`❄️ **Ghosting** (tidak membalas > 3 hari, otomatis jadi cold):`);
    for (const row of ghosted) lines.push(`• ${escapeDiscord(row.full_name, 60)} (${row.whatsapp_phone}), sebelumnya ${row.previous_status}`);
  }
  const notes = [
    unchanged && `${unchanged} tanpa perubahan`,
    thin && `${thin} chat belum cukup info`,
    refused.length && `${refused.length} tidak mau dianalisa AI (${refused.map((item) => item.whatsapp_phone).join(", ")})`,
    failed.length && `${failed.length} gagal (${escapeDiscord(failed[0].error, 120)})`,
  ].filter(Boolean);
  if (notes.length || tokensIn) {
    lines.push("");
    if (notes.length) lines.push(`ℹ️ ${notes.join(" • ")}`);
    if (tokensIn) lines.push(`Token: masuk ${formatTokens(tokensIn)} / keluar ${formatTokens(tokensOut)}`);
  }
  if (run.error) lines.push(`⚠️ Analisa berhenti: ${escapeDiscord(run.error, 200)}`);
  return packMessages(lines);
}
