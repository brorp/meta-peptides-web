// Turns one Baileys message into the payload for /api/bot/whatsapp/inbound,
// or { skip: reason }. No Baileys import, so it can be tested with plain
// objects.

const MAX_AGE_MS = 15 * 60 * 1000;
const MAX_TEXT = 4000;

// Wrappers WhatsApp puts around the real content. deviceSentMessage is what a
// message the CS sends from the phone looks like on a linked device.
const WRAPPERS = [
  "ephemeralMessage",
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
  "documentWithCaptionMessage",
  "deviceSentMessage",
];

// Content kinds that are not a chat message (reactions, deletes, edits,
// key exchange, polls...).
const NOT_A_MESSAGE = new Set([
  "protocolMessage",
  "reactionMessage",
  "senderKeyDistributionMessage",
  "messageContextInfo",
  "pollUpdateMessage",
  "keepInChatMessage",
  "pinInChatMessage",
  "encReactionMessage",
  "encEventResponseMessage",
  "callLogMesssage",
  "callLogMessage",
]);

export function parseJid(jid) {
  const match = /^([^:@]+)(?::\d+)?@([a-z.]+)$/.exec(String(jid || ""));
  return match ? { user: match[1], server: match[2] } : null;
}

const isPhoneJid = (jid) => {
  const parsed = parseJid(jid);
  return Boolean(parsed && (parsed.server === "s.whatsapp.net" || parsed.server === "c.us") && /^\d{6,17}$/.test(parsed.user));
};

export function unwrapContent(message) {
  let content = message || null;
  for (let depth = 0; content && depth < 5; depth += 1) {
    const wrapper = WRAPPERS.find((key) => content[key]?.message);
    if (!wrapper) break;
    content = content[wrapper].message;
  }
  return content;
}

function timestampMs(value) {
  if (value === null || value === undefined) return null;
  // Baileys gives seconds as a number or a protobuf Long.
  const seconds = typeof value === "object" && typeof value.toNumber === "function" ? value.toNumber() : Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

function readContent(content) {
  const keys = Object.keys(content || {}).filter((key) => content[key] !== null && content[key] !== undefined);
  const kind = keys.find((key) => !NOT_A_MESSAGE.has(key));
  if (!kind) return null;
  const part = content[kind] || {};
  const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
  switch (kind) {
    case "conversation":
      return { type: "text", text: text(part), context: null };
    case "extendedTextMessage":
      return { type: "text", text: text(part.text), context: part.contextInfo || null };
    case "imageMessage":
      return { type: "image", text: text(part.caption), context: part.contextInfo || null };
    case "videoMessage":
    case "ptvMessage":
      return { type: "video", text: text(part.caption), context: part.contextInfo || null };
    case "audioMessage":
      return { type: "audio", text: null, context: part.contextInfo || null };
    case "documentMessage":
      return { type: "document", text: text(part.caption), context: part.contextInfo || null };
    case "stickerMessage":
      return { type: "sticker", text: null, context: part.contextInfo || null };
    case "locationMessage":
    case "liveLocationMessage":
      // Coordinates are not kept.
      return { type: "location", text: null, context: part.contextInfo || null };
    case "contactMessage":
    case "contactsArrayMessage":
      // Other people's numbers are not kept.
      return { type: "contact", text: null, context: part.contextInfo || null };
    case "buttonsResponseMessage":
      return { type: "text", text: text(part.selectedDisplayText), context: part.contextInfo || null };
    case "templateButtonReplyMessage":
      return { type: "text", text: text(part.selectedDisplayText), context: part.contextInfo || null };
    case "listResponseMessage":
      return { type: "text", text: text(part.title), context: part.contextInfo || null };
    default:
      return { type: "other", text: null, context: part.contextInfo || null };
  }
}

// Click-to-WhatsApp ads carry a ctwaClid / ad source; a prefilled ad text
// from WA_AD_TEXT_PATTERNS also counts.
export function adInfo(context, text, adTextPatterns = []) {
  const ext = context?.externalAdReply || null;
  const sources = [context?.conversionSource, context?.entryPointConversionSource, ext?.sourceType]
    .filter(Boolean)
    .join(" ");
  const lowered = String(text || "").toLowerCase();
  const fromText = adTextPatterns.some((pattern) => pattern && lowered.startsWith(pattern.toLowerCase()));
  const isAd = Boolean(ext?.ctwaClid) || /(^|[^a-z])ads?([^a-z]|$)|ctwa/i.test(sources) || fromText;
  return {
    is_ad: isAd,
    ad_title: isAd ? String(ext?.title || "").trim().slice(0, 120) || null : null,
    entry_app: String(context?.entryPointConversionApp || "").trim().toLowerCase().slice(0, 40) || null,
    entry_source: String(context?.entryPointConversionSource || context?.conversionSource || "").trim().slice(0, 60) || null,
  };
}

export function parseAdTextPatterns(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * @param {object} message Baileys WAMessage
 * @param {object} options
 * @param {(lidJid: string) => Promise<string | null>} options.resolveLid LID jid -> phone jid
 * @param {string | null} options.selfPhone own number (digits), its chat is skipped
 * @param {string[]} options.adTextPatterns
 * @param {number} options.now
 */
export async function mapMessage(message, options = {}) {
  const now = options.now ?? Date.now();
  const key = message?.key || {};
  const chatJid = String(key.remoteJid || "");
  const parsed = parseJid(chatJid);
  if (!parsed) return { skip: "no_chat" };
  // Groups, status updates, broadcast lists, channels, Meta AI / bots.
  if (parsed.server !== "s.whatsapp.net" && parsed.server !== "c.us" && parsed.server !== "lid") {
    return { skip: "not_private_chat" };
  }
  if (!key.id) return { skip: "no_id" };

  const sentAt = timestampMs(message.messageTimestamp);
  if (!sentAt) return { skip: "no_time" };
  // Old messages (history sync, phone catching up) never start a lead.
  if (now - sentAt > MAX_AGE_MS) return { skip: "old_message" };

  let phoneJid = null;
  if (parsed.server === "lid") {
    if (isPhoneJid(key.remoteJidAlt)) phoneJid = key.remoteJidAlt;
    else if (options.resolveLid) phoneJid = await options.resolveLid(chatJid).catch(() => null);
    if (!isPhoneJid(phoneJid)) return { skip: "lid_without_phone" };
  } else {
    phoneJid = chatJid;
  }
  const phone = parseJid(phoneJid).user;
  if (!/^\d{6,17}$/.test(phone)) return { skip: "not_private_chat" };
  if (options.selfPhone && phone === options.selfPhone) return { skip: "self_chat" };
  // The CRM only stores Indonesian numbers.
  if (!phone.startsWith("62")) return { skip: "foreign_number" };

  const content = readContent(unwrapContent(message.message));
  if (!content) return { skip: "not_a_message" };

  const fromMe = Boolean(key.fromMe);
  const ad = adInfo(content.context, content.text, fromMe ? [] : options.adTextPatterns || []);
  return {
    payload: {
      wa_message_id: String(key.id),
      phone,
      direction: fromMe ? "out" : "in",
      // The profile name on a message the CS sent is the CS's own name.
      push_name: fromMe ? null : String(message.pushName || "").trim().slice(0, 200) || null,
      message_type: content.type,
      text: content.text ? content.text.slice(0, MAX_TEXT) : null,
      ...(fromMe ? { is_ad: false, ad_title: null, entry_app: null, entry_source: null } : ad),
      sent_at: new Date(sentAt).toISOString(),
    },
  };
}
