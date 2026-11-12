import assert from "node:assert/strict";
import test from "node:test";
import { adInfo, mapMessage, parseAdTextPatterns, parseJid, unwrapContent } from "./mapper.mjs";

const NOW = Date.parse("2026-11-11T05:00:00Z");
const secondsAgo = (seconds) => Math.floor((NOW - seconds * 1000) / 1000);
const msg = (overrides = {}) => ({
  key: { remoteJid: "6281234567890@s.whatsapp.net", fromMe: false, id: "3EB0ABC123", ...(overrides.key || {}) },
  pushName: "Budi",
  messageTimestamp: secondsAgo(10),
  message: { conversation: "Halo kak, mau tanya reta" },
  ...overrides,
  ...(overrides.key ? { key: { remoteJid: "6281234567890@s.whatsapp.net", fromMe: false, id: "3EB0ABC123", ...overrides.key } } : {}),
});
const map = (message, options = {}) => mapMessage(message, { now: NOW, selfPhone: "6289900000000", ...options });

test("incoming text from a private chat", async () => {
  const { payload } = await map(msg());
  assert.deepEqual(payload, {
    wa_message_id: "3EB0ABC123",
    phone: "6281234567890",
    direction: "in",
    push_name: "Budi",
    message_type: "text",
    text: "Halo kak, mau tanya reta",
    is_ad: false,
    ad_title: null,
    entry_app: null,
    entry_source: null,
    sent_at: new Date(secondsAgo(10) * 1000).toISOString(),
  });
});

test("device suffix in the jid is ignored", async () => {
  assert.equal((await map(msg({ key: { remoteJid: "6281234567890:12@s.whatsapp.net" } }))).payload.phone, "6281234567890");
});

test("groups, status, broadcast lists, channels and bots are skipped", async () => {
  for (const remoteJid of ["120363000000000000@g.us", "status@broadcast", "1234567890@broadcast", "120363000000@newsletter", "13135550002@bot"]) {
    assert.equal((await map(msg({ key: { remoteJid } }))).skip, "not_private_chat", remoteJid);
  }
});

test("old messages (history, catching up) are skipped", async () => {
  assert.equal((await map(msg({ messageTimestamp: secondsAgo(16 * 60) }))).skip, "old_message");
  assert.ok((await map(msg({ messageTimestamp: secondsAgo(14 * 60) }))).payload);
});

test("protobuf Long timestamps work", async () => {
  const value = secondsAgo(5);
  assert.ok((await map(msg({ messageTimestamp: { toNumber: () => value } }))).payload);
});

test("@lid chat: phone from remoteJidAlt, then from the LID store, otherwise skipped", async () => {
  const lid = "99887766554433@lid";
  const fromAlt = await map(msg({ key: { remoteJid: lid, remoteJidAlt: "6281111111111@s.whatsapp.net" } }));
  assert.equal(fromAlt.payload.phone, "6281111111111");

  const fromStore = await map(msg({ key: { remoteJid: lid } }), { resolveLid: async (jid) => (jid === lid ? "6282222222222:3@s.whatsapp.net" : null) });
  assert.equal(fromStore.payload.phone, "6282222222222");

  assert.equal((await map(msg({ key: { remoteJid: lid } }), { resolveLid: async () => null })).skip, "lid_without_phone");
  assert.equal((await map(msg({ key: { remoteJid: lid } }), { resolveLid: async () => { throw new Error("x"); } })).skip, "lid_without_phone");
  assert.equal((await map(msg({ key: { remoteJid: lid, remoteJidAlt: "123@lid" } }))).skip, "lid_without_phone");
});

test("own chat and foreign numbers are skipped", async () => {
  assert.equal((await map(msg({ key: { remoteJid: "6289900000000@s.whatsapp.net" } }))).skip, "self_chat");
  assert.equal((await map(msg({ key: { remoteJid: "14155550100@s.whatsapp.net" } }))).skip, "foreign_number");
});

test("message sent by the CS from the phone: direction out, no push name, no ad info", async () => {
  const { payload } = await map(msg({
    key: { fromMe: true },
    pushName: "CS MetaPeptides",
    message: { deviceSentMessage: { destinationJid: "6281234567890@s.whatsapp.net", message: { extendedTextMessage: { text: "Halo kak, ada yang bisa dibantu?" } } } },
  }), { adTextPatterns: ["Halo kak"] });
  assert.equal(payload.direction, "out");
  assert.equal(payload.push_name, null);
  assert.equal(payload.text, "Halo kak, ada yang bisa dibantu?");
  assert.equal(payload.is_ad, false);
});

test("reactions, deletes and key exchange are not messages", async () => {
  for (const message of [
    { reactionMessage: { text: "👍" } },
    { protocolMessage: { type: 0 } },
    { senderKeyDistributionMessage: {}, messageContextInfo: {} },
    {},
  ]) {
    assert.equal((await map(msg({ message }))).skip, "not_a_message", JSON.stringify(message));
  }
});

test("media: caption kept, voice notes / location / contacts have no text", async () => {
  const cases = [
    [{ imageMessage: { caption: "ini foto produknya" } }, "image", "ini foto produknya"],
    [{ ephemeralMessage: { message: { videoMessage: { caption: "" } } } }, "video", null],
    [{ audioMessage: { ptt: true } }, "audio", null],
    [{ locationMessage: { degreesLatitude: -6.2, degreesLongitude: 106.8, name: "Rumah" } }, "location", null],
    [{ contactMessage: { displayName: "Teman", vcard: "BEGIN:VCARD..." } }, "contact", null],
    [{ documentWithCaptionMessage: { message: { documentMessage: { caption: "hasil lab", fileName: "lab.pdf" } } } }, "document", "hasil lab"],
    [{ viewOnceMessageV2: { message: { imageMessage: {} } } }, "image", null],
    [{ messageContextInfo: {}, stickerMessage: {} }, "sticker", null],
    [{ buttonsResponseMessage: { selectedDisplayText: "Mau order" } }, "text", "Mau order"],
    [{ pollCreationMessage: { name: "?" } }, "other", null],
  ];
  for (const [message, type, text] of cases) {
    const { payload } = await map(msg({ message }));
    assert.equal(payload.message_type, type, JSON.stringify(message));
    assert.equal(payload.text, text, JSON.stringify(message));
  }
});

test("long text is cut at 4000 characters", async () => {
  const { payload } = await map(msg({ message: { conversation: "a".repeat(5000) } }));
  assert.equal(payload.text.length, 4000);
});

test("Click-to-WhatsApp ad: ctwaClid, ad source, Instagram entry point", async () => {
  const fromAd = await map(msg({ message: { extendedTextMessage: { text: "Halo", contextInfo: { externalAdReply: { title: "Promo Reta", ctwaClid: "abc", sourceType: "ad" } } } } }));
  assert.equal(fromAd.payload.is_ad, true);
  assert.equal(fromAd.payload.ad_title, "Promo Reta");

  assert.equal(adInfo({ conversionSource: "FB_Ads" }, "").is_ad, true);
  assert.equal(adInfo({ entryPointConversionSource: "ctwa_ad" }, "").is_ad, true);
  assert.equal(adInfo({ entryPointConversionSource: "click_to_chat_link", entryPointConversionApp: "Instagram" }, "").is_ad, false);
  assert.equal(adInfo({ entryPointConversionSource: "click_to_chat_link", entryPointConversionApp: "Instagram" }, "").entry_app, "instagram");
  assert.equal(adInfo(null, "Halo").is_ad, false);
});

test("prefilled ad text from WA_AD_TEXT_PATTERNS counts as an ad", async () => {
  const patterns = parseAdTextPatterns(" Halo, saya mau tanya | Hi, I'm interested |");
  assert.deepEqual(patterns, ["Halo, saya mau tanya", "Hi, I'm interested"]);
  assert.equal((await map(msg({ message: { conversation: "halo, saya mau tanya produk reta" } }), { adTextPatterns: patterns })).payload.is_ad, true);
  assert.equal((await map(msg({ message: { conversation: "kak saya mau tanya" } }), { adTextPatterns: patterns })).payload.is_ad, false);
});

test("helpers", () => {
  assert.deepEqual(parseJid("6281:4@s.whatsapp.net"), { user: "6281", server: "s.whatsapp.net" });
  assert.equal(parseJid("garbage"), null);
  assert.deepEqual(unwrapContent({ ephemeralMessage: { message: { viewOnceMessage: { message: { conversation: "x" } } } } }), { conversation: "x" });
});
