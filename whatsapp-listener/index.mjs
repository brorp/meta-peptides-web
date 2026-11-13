// WhatsApp linked device for the CS number. Every new chat message goes to
// /api/bot/whatsapp/inbound; new numbers become leads and are posted to
// Discord. Leads are saved as contacts in the WhatsApp account
// (contacts.mjs). Apart from those contacts it never writes to WhatsApp: no
// messages, receipts, or presence (see readonly.test.mjs).
//
// The Discord bot controls it through a local Unix socket (control.mjs):
// !wastatus, !walogin (QR or pairing code), !walogout, !warestart, !warun,
// !synccontacts.
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "baileys";
import pino from "pino";
import QRCode from "qrcode";
import { getListenerConfig, postListenerWithRetry } from "./api-client.mjs";
import { createContactSync } from "./contacts.mjs";
import { ControlError, DEFAULT_SOCKET_PATH, createControlServer, listenControl, normalizePhone } from "./control.mjs";
import { analysisDigest, isDiscordWebhookUrl, leadCardText, postDiscord } from "./discord.mjs";
import { mapMessage, parseAdTextPatterns, parseJid } from "./mapper.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(here, "auth");
const SOCKET_PATH = process.env.WA_CONTROL_SOCKET || DEFAULT_SOCKET_PATH;
const config = getListenerConfig();
const webhookUrl = process.env.DISCORD_WA_WEBHOOK_URL || "";
const settingsWebhookUrl = process.env.DISCORD_WA_SETTINGS_WEBHOOK_URL || "";
const expectedPhone = normalizePhone(process.env.WA_EXPECTED_PHONE);
const adTextPatterns = parseAdTextPatterns(process.env.WA_AD_TEXT_PATTERNS);
// WA_SAVE_CONTACTS=0 turns the WhatsApp contacts for leads off.
const saveContacts = process.env.WA_SAVE_CONTACTS !== "0";
const logLevel = ["error", "warn", "info"].includes(process.env.WA_LOG_LEVEL) ? process.env.WA_LOG_LEVEL : "error";
const logger = pino({ level: logLevel });
const BAILEYS_VERSION = (() => {
  try {
    return JSON.parse(readFileSync(path.join(here, "node_modules", "baileys", "package.json"), "utf8")).version;
  } catch {
    return null;
  }
})();

if (!isDiscordWebhookUrl(webhookUrl)) {
  console.warn("DISCORD_WA_WEBHOOK_URL kosong atau bukan webhook Discord: lead tetap dibuat, tapi tidak ada kartu di Discord.");
}
if (process.env.WA_EXPECTED_PHONE && !expectedPhone) {
  console.warn("WA_EXPECTED_PHONE bukan nomor Indonesia yang valid: diabaikan.");
}

const log = (...parts) => console.log(new Date().toISOString(), ...parts);
const nowIso = () => new Date().toISOString();
// Lead cards, the analysis digest and @lid warnings: the leads channel.
const notify = (text) => postDiscord(webhookUrl, text);
// Connection and job problems: the whatsapp-settings channel when it has its
// own webhook, otherwise the leads channel.
const notifySettings = (text) =>
  postDiscord(isDiscordWebhookUrl(settingsWebhookUrl) ? settingsWebhookUrl : webhookUrl, text, { username: "WhatsApp Listener" });

// --- state shown by !wastatus ------------------------------------------------

const wa = {
  // starting | connecting | qr | open | reconnecting | replaced | needs_login
  state: "starting",
  since: nowIso(),
  linked: false,
  phone: null,
  name: null,
  connectedAt: null,
  lastDisconnect: null,
  qr: null,
  qrCount: 0,
  qrAt: null,
  // { phone, code, error, requested } while logging in with a pairing code
  pairing: null,
  // { source: "boot" | "discord", startedAt } while a QR or code is shown
  login: null,
  loginError: null,
  waVersion: null,
};
const stats = {
  startedAt: nowIso(),
  messagesIn: 0,
  messagesOut: 0,
  leadsCreated: 0,
  existingCustomerLeads: 0,
  failed: 0,
  unresolvedLids: 0,
  lastMessageAt: null,
  lastLeadAt: null,
  lastError: null,
};
const jobs = { running: null, lastAnalysis: null, lastDaily: null };

// --- contacts --------------------------------------------------------------

// Only on the CS number, while connected.
const contactSync = createContactSync({
  api: (route, json) => postListenerWithRetry(route, json, { config, attempts: 2 }),
  getSocket: () => socket,
  isReady: () => saveContacts && wa.state === "open" && Boolean(socket) && (!expectedPhone || wa.phone === expectedPhone),
  log,
});
// New leads and changed names every 2 minutes; a lead created from a chat a
// few seconds after its first message.
let contactSoon = null;
function saveContactsSoon() {
  if (!saveContacts || contactSoon) return;
  contactSoon = setTimeout(() => {
    contactSoon = null;
    contactSync.run();
  }, 5_000);
  contactSoon.unref();
}
function scheduleContacts() {
  if (saveContacts) setInterval(() => contactSync.run(), 2 * 60 * 1000).unref();
}

// Director-only supervision is evaluated independently of the twice-daily
// lead analysis. Await the ingestion queue so a just-received CS reply is
// saved before measuring response time. Never post findings to staff chats.
let supervising = false;
async function supervise() {
  if (supervising) return;
  supervising = true;
  try {
    await queue;
    await postListenerWithRetry("/api/bot/whatsapp/supervise", { connected:wa.state === "open" }, { config, attempts:1, timeoutMs:65_000 });
  } catch (error) {
    log(`supervisi belum selesai (HTTP ${Number(error?.status) || 0}); dicoba lagi pada jadwal berikutnya`);
  } finally { supervising = false; }
}
function scheduleSupervision() {
  setTimeout(supervise, 15_000).unref();
  setInterval(supervise, 2 * 60 * 1000).unref();
}

function setState(state) {
  if (wa.state === state) return;
  wa.state = state;
  wa.since = nowIso();
}

// --- messages --------------------------------------------------------------

// Messages are handled one at a time, in order.
let queue = Promise.resolve();
const enqueue = (task) => {
  queue = queue.then(task).catch((error) => log("queue error:", error?.message || error));
  return queue;
};

let unresolvedLids = 0;
let lastLidWarning = 0;
async function warnUnresolvedLid() {
  unresolvedLids += 1;
  stats.unresolvedLids += 1;
  if (Date.now() - lastLidWarning < 60 * 60 * 1000) return;
  lastLidWarning = Date.now();
  await notify(
    `⚠️ ${unresolvedLids} chat WhatsApp masuk tanpa nomor HP (WhatsApp hanya memberi ID samaran), jadi belum bisa dijadikan lead. Cek chat terbaru di HP dan buat lead-nya dengan !newleads kalau perlu.`,
  );
  unresolvedLids = 0;
}

async function handleMessage(sock, message) {
  const selfPhone = parseJid(sock.user?.id)?.user || null;
  // Someone else's number was linked: never read its chats.
  if (expectedPhone && selfPhone !== expectedPhone) return;
  const mapped = await mapMessage(message, {
    resolveLid: (jid) => sock.signalRepository?.lidMapping?.getPNForLID(jid) ?? Promise.resolve(null),
    selfPhone,
    adTextPatterns,
  });
  if (mapped.skip) {
    if (mapped.skip === "lid_without_phone" && !message.key?.fromMe) await warnUnresolvedLid();
    return;
  }

  let result;
  try {
    result = await postListenerWithRetry("/api/bot/whatsapp/inbound", mapped.payload, { config });
  } catch (error) {
    // No chat text in the log: only the reason and the last digits.
    log(`inbound gagal (…${mapped.payload.phone.slice(-4)}): ${error.status || ""} ${error.message}`);
    stats.failed += 1;
    stats.lastError = { at: nowIso(), message: `${error.status ? `${error.status} ` : ""}${error.message}` };
    if (error.status === 503) await notifySettings(`⚠️ WhatsApp listener: ${error.message}`);
    return;
  }
  if (mapped.payload.direction === "in") {
    stats.messagesIn += 1;
    stats.lastMessageAt = nowIso();
  } else {
    stats.messagesOut += 1;
  }
  if (result.action === "lead_created" || result.action === "lead_created_existing_customer") {
    if (result.action === "lead_created") stats.leadsCreated += 1;
    else stats.existingCustomerLeads += 1;
    stats.lastLeadAt = nowIso();
    const posted = await notify(leadCardText(result, mapped.payload));
    log(`${result.action} …${mapped.payload.phone.slice(-4)}${posted ? "" : " (kartu Discord gagal dikirim)"}`);
    saveContactsSoon();
  }
}

// --- jobs (scheduled, or !warun) --------------------------------------------

// Chat analysis: batches until the API says there is nothing left, then one
// digest in the leads channel. The first batch also runs the ghosting rule.
async function runAnalysis(slot) {
  const run = { items: [], ghosted: [], error: null };
  for (let round = 0; round < 25; round += 1) {
    let batch;
    try {
      const exclude = run.items.filter((item) => item.result === "error" && item.lead_id).map((item) => item.lead_id);
      batch = await postListenerWithRetry("/api/bot/whatsapp/analyze", { ghosting: round === 0, exclude }, { config, timeoutMs: 290_000, attempts: 2 });
    } catch (error) {
      run.error = error.message;
      break;
    }
    run.items.push(...(batch.items || []));
    run.ghosted.push(...(batch.ghosted || []));
    if (batch.error) run.error = batch.error;
    if (batch.configured === false) {
      run.notConfigured = true;
      run.setupError = batch.setup_error || null;
    }
    if (!batch.configured || batch.error || !batch.more) break;
  }
  log(`analisa ${slot}: ${run.items.length} lead, ${run.ghosted.length} ghosting${run.error ? `, error: ${run.error}` : ""}`);
  for (const text of analysisDigest(run, slot)) await notify(text);
  jobs.lastAnalysis = {
    slot,
    at: nowIso(),
    items: run.items.length,
    suggested: run.items.filter((item) => item.result === "suggested").length,
    auto_applied: run.items.filter((item) => item.applied?.length).length,
    failed: run.items.filter((item) => item.result === "error").length,
    ghosted: run.ghosted.length,
    configured: !run.notConfigured,
    setup_error: run.setupError || null,
    error: run.error,
  };
  return jobs.lastAnalysis;
}

// Daily job: delete chat text older than 90 days.
async function runDaily() {
  const summary = { at: null, deleted: null, purge_error: null, error: null };
  try {
    const result = await postListenerWithRetry("/api/bot/whatsapp/daily", {}, { config });
    summary.deleted = result.deleted ?? null;
    summary.purge_error = result.purge_error || null;
    log(`harian: ${result.deleted ?? "-"} pesan lama dihapus`);
  } catch (error) {
    summary.error = error.message;
    log(`tugas harian gagal: ${error.message}`);
  }
  summary.at = nowIso();
  jobs.lastDaily = summary;
  return summary;
}

const JOB_LABEL = { analysis: "Analisa chat", daily: "Tugas harian" };
async function runJob(name, task) {
  if (jobs.running) throw new ControlError(`${JOB_LABEL[jobs.running]} sedang berjalan, tunggu sampai selesai.`, 409);
  jobs.running = name;
  try {
    return await task();
  } finally {
    jobs.running = null;
  }
}

// Every 10 minutes: 03.00 WIB daily job, 12.00 and 23.00 WIB chat analysis.
const doneSlots = new Set();
function scheduleDaily() {
  setInterval(async () => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
        .formatToParts(new Date())
        .map((part) => [part.type, part.value]),
    );
    const day = `${parts.year}-${parts.month}-${parts.day}`;
    const slotKey = `${day} ${parts.hour}`;
    if (!["03", "12", "23"].includes(parts.hour) || doneSlots.has(slotKey)) return;
    doneSlots.add(slotKey);
    if (doneSlots.size > 50) doneSlots.delete(doneSlots.values().next().value);
    const job = parts.hour === "03" ? runJob("daily", runDaily) : runJob("analysis", () => runAnalysis(`${parts.hour}.00`));
    await job.catch((error) => log(`jadwal ${parts.hour}.00 dilewati: ${error.message}`));
  }, 10 * 60 * 1000).unref();
}

// --- WhatsApp connection -----------------------------------------------------

let generation = 0;
let socket = null;
let retryTimer = null;
let reconnectDelay = 5_000;
let alertedDown = false;
// Why the next "logged out" happens: "discord" (!walogout) or "wrong_number".
let intentionalLogout = null;
// The auth state of the current socket, reused when WhatsApp asks for a
// restart right after pairing (its keys may not be on disk yet).
let authCache = null;

// Keys from a finished pairing. A failed pairing code leaves `me` without
// `account`, which cannot log in.
const isLinked = (creds) => Boolean(creds?.account && creds?.me?.id);

function moveAuthAside() {
  if (existsSync(AUTH_DIR)) renameSync(AUTH_DIR, path.join(here, `auth-loggedout-${Date.now()}`));
  authCache = null;
  wa.linked = false;
}

// Closes the current socket; its events are ignored from now on.
function stopSocket() {
  clearTimeout(retryTimer);
  retryTimer = null;
  generation += 1;
  const old = socket;
  socket = null;
  try {
    old?.end(undefined);
  } catch {
    // Already closed.
  }
}

function scheduleConnect(ms, options) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => connect(options).catch(fatal), ms);
}

async function connect({ pairingPhone = null, fresh = false, reuseAuth = false } = {}) {
  stopSocket();
  const gen = generation;
  setState("connecting");
  let auth = reuseAuth ? authCache : null;
  if (auth) {
    await auth.saveCreds();
  } else {
    if (fresh) rmSync(AUTH_DIR, { recursive: true, force: true });
    mkdirSync(AUTH_DIR, { recursive: true, mode: 0o700 });
    chmodSync(AUTH_DIR, 0o700);
    auth = await useMultiFileAuthState(AUTH_DIR);
  }
  if (gen !== generation) return;
  const { state, saveCreds } = auth;
  // Left by a pairing code that was never entered: start over.
  if (!isLinked(state.creds) && state.creds.me && !fresh && !reuseAuth) return connect({ pairingPhone, fresh: true });
  authCache = auth;
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  if (gen !== generation) return;

  wa.waVersion = version ? version.join(".") : wa.waVersion;
  wa.linked = isLinked(state.creds);
  if (!wa.linked && !wa.login) wa.login = { source: "boot", startedAt: nowIso() };
  wa.pairing = pairingPhone ? { phone: pairingPhone, code: null, error: null, requested: false } : null;
  wa.qr = null;

  const sock = makeWASocket({
    auth: state,
    ...(version ? { version } : {}),
    logger,
    browser: Browsers.ubuntu("MetaWellness Leads"),
    // Stay "offline" so the CS phone keeps getting notifications.
    markOnlineOnConnect: false,
    // Old chats are never read.
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    generateHighQualityLinkPreview: false,
    getMessage: async () => undefined,
  });
  socket = sock;

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    onConnectionUpdate(sock, gen, update).catch((error) => log("connection.update error:", error?.message || error));
  });
  sock.ev.on("messages.upsert", ({ messages }) => {
    if (gen !== generation) return;
    for (const message of messages || []) enqueue(() => handleMessage(sock, message));
  });
}

async function onConnectionUpdate(sock, gen, update) {
  if (gen !== generation) return;

  if (update.qr) {
    wa.qr = update.qr;
    wa.qrCount += 1;
    wa.qrAt = nowIso();
    setState("qr");
    if (wa.pairing && !wa.pairing.requested) {
      wa.pairing.requested = true;
      try {
        wa.pairing.code = await sock.requestPairingCode(wa.pairing.phone);
        log(`kode pairing dibuat untuk …${wa.pairing.phone.slice(-4)}`);
      } catch (error) {
        wa.pairing.error = error?.message || String(error);
      }
    } else if (!wa.pairing) {
      // Scanning links the scanner's own WhatsApp account to this listener.
      console.log("\nScan QR ini dari HP CS: WhatsApp Business → Settings → Linked Devices → Link a Device (atau ketik !walogin di Discord)\n");
      console.log(await QRCode.toString(update.qr, { type: "terminal", small: true }));
    }
  }

  if (update.connection === "open") {
    const phone = parseJid(sock.user?.id)?.user || null;
    const login = wa.login;
    wa.qr = null;
    wa.pairing = null;
    wa.login = null;
    wa.linked = true;
    if (expectedPhone && phone !== expectedPhone) {
      // Someone scanned with another number: unlink right away.
      wa.loginError = `wrong_number:${phone}`;
      intentionalLogout = "wrong_number";
      log(`nomor …${String(phone).slice(-4)} bukan WA_EXPECTED_PHONE, dilepas`);
      await notifySettings(
        `⚠️ Yang login ke WhatsApp listener adalah nomor …${String(phone).slice(-4)}, bukan nomor CS (…${expectedPhone.slice(-4)}). Linked device langsung dilepas dan chat nomor itu tidak dibaca. Login lagi dengan \`!walogin\` dari HP CS.`,
      );
      await sock.logout().catch(() => {
        // Could not unlink through WhatsApp: at least drop the session here.
        intentionalLogout = null;
        stopSocket();
        moveAuthAside();
        setState("needs_login");
      });
      return;
    }
    wa.phone = phone;
    wa.name = sock.user?.verifiedName || sock.user?.name || null;
    wa.connectedAt = nowIso();
    wa.loginError = null;
    reconnectDelay = 5_000;
    setState("open");
    log(`tersambung sebagai …${String(phone).slice(-4)}`);
    if (login && login.source !== "discord") {
      await notifySettings(`✅ WhatsApp listener login sebagai **+${phone}**. Chat baru otomatis jadi lead.`);
    } else if (alertedDown) {
      await notifySettings("✅ WhatsApp listener tersambung lagi. Chat baru kembali otomatis jadi lead.");
    }
    alertedDown = false;
  }

  if (update.connection !== "close") return;
  if (socket === sock) socket = null;
  const code = update.lastDisconnect?.error?.output?.statusCode ?? null;
  wa.lastDisconnect = { code, at: nowIso() };
  wa.qr = null;

  if (code === DisconnectReason.restartRequired) {
    // Normal right after a new login: WhatsApp asks for a fresh connection.
    scheduleConnect(500, { reuseAuth: true });
    return;
  }
  if (code === DisconnectReason.loggedOut) {
    const reason = intentionalLogout;
    intentionalLogout = null;
    moveAuthAside();
    wa.login = null;
    wa.pairing = null;
    alertedDown = false;
    setState("needs_login");
    log(`ter-logout${reason ? ` (${reason})` : ""}`);
    if (!reason) {
      await notifySettings("⚠️ WhatsApp listener ter-logout (linked device dihapus dari HP, atau dilepas WhatsApp). Chat baru tidak jadi lead otomatis sampai login lagi: ketik `!walogin` di channel whatsapp-settings.");
    }
    return;
  }
  if (!wa.linked) {
    // The QR or pairing code expired (or the connection failed before
    // linking): wait for !walogin instead of asking WhatsApp for new QRs.
    const login = wa.login;
    wa.login = null;
    wa.pairing = null;
    if (!wa.loginError) wa.loginError = code === DisconnectReason.timedOut ? "expired" : `closed:${code ?? "-"}`;
    setState("needs_login");
    log(`belum login (kode ${code ?? "-"}), menunggu !walogin`);
    if (login?.source !== "discord") {
      await notifySettings("ℹ️ WhatsApp listener belum login, jadi chat WA belum jadi lead otomatis. Ketik `!walogin` di channel whatsapp-settings untuk menampilkan QR.");
    }
    return;
  }
  if (code === DisconnectReason.connectionReplaced) {
    // Another listener with the same keys is running: do not fight it.
    alertedDown = true;
    setState("replaced");
    await notifySettings("⚠️ WhatsApp listener terputus karena ada listener lain yang memakai sesi yang sama. Pastikan hanya satu yang jalan (`pm2 list`, `systemctl status`). Dicoba lagi 10 menit lagi, atau `!warestart`.");
    scheduleConnect(10 * 60 * 1000);
    return;
  }
  setState("reconnecting");
  if (!alertedDown && reconnectDelay >= 60_000) {
    alertedDown = true;
    await notifySettings(`⚠️ WhatsApp listener terputus (kode ${code ?? "-"}), sedang mencoba tersambung lagi.`);
  }
  log(`terputus (kode ${code ?? "-"}), sambung lagi dalam ${reconnectDelay / 1000} detik`);
  scheduleConnect(reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 120_000);
}

// --- control API for the Discord bot -----------------------------------------

let qrPng = { qr: null, base64: null };
async function qrPngBase64(qr) {
  if (qrPng.qr !== qr) {
    const buffer = await QRCode.toBuffer(qr, { type: "png", width: 480, margin: 3, errorCorrectionLevel: "M" });
    qrPng = { qr, base64: buffer.toString("base64") };
  }
  return qrPng.base64;
}

async function statusJson() {
  const showQr = wa.state === "qr" && wa.qr && !wa.pairing;
  return {
    state: wa.state,
    since: wa.since,
    linked: wa.linked,
    phone: wa.phone,
    name: wa.name,
    expected_phone: expectedPhone,
    connected_at: wa.state === "open" ? wa.connectedAt : null,
    last_disconnect: wa.lastDisconnect,
    login: wa.login ? { source: wa.login.source, started_at: wa.login.startedAt } : null,
    login_error: wa.loginError,
    qr: showQr ? { id: wa.qrCount, at: wa.qrAt, png_base64: await qrPngBase64(wa.qr) } : null,
    pairing: wa.pairing ? { phone: wa.pairing.phone, code: wa.pairing.code, error: wa.pairing.error } : null,
    stats: {
      started_at: stats.startedAt,
      messages_in: stats.messagesIn,
      messages_out: stats.messagesOut,
      leads_created: stats.leadsCreated,
      existing_customer_leads: stats.existingCustomerLeads,
      failed: stats.failed,
      unresolved_lids: stats.unresolvedLids,
      last_message_at: stats.lastMessageAt,
      last_lead_at: stats.lastLeadAt,
      last_error: stats.lastError,
    },
    jobs: { running: jobs.running, last_analysis: jobs.lastAnalysis, last_daily: jobs.lastDaily },
    contacts: {
      enabled: saveContacts,
      running: contactSync.state.running,
      saved_total: contactSync.state.savedTotal,
      failed_total: contactSync.state.failedTotal,
      last: contactSync.state.last,
    },
    process: {
      uptime_s: Math.round(process.uptime()),
      rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      node: process.version,
      baileys: BAILEYS_VERSION,
      wa_version: wa.waVersion,
    },
    webhooks: { leads: isDiscordWebhookUrl(webhookUrl), settings: isDiscordWebhookUrl(settingsWebhookUrl) },
  };
}

const controlRoutes = {
  "GET /status": statusJson,

  // Shows a QR (no phone) or a pairing code (phone). Joins a login that
  // Discord already started with the same kind of code; a QR shown only in
  // the terminal is replaced so the user gets the full time to scan.
  "POST /login": async (body) => {
    if (wa.state === "open") {
      throw new ControlError(`Sudah tersambung sebagai +${wa.phone}. Untuk ganti nomor: \`!walogout ya\`, lalu \`!walogin\`.`, 409);
    }
    if (wa.linked) {
      throw new ControlError("Sesi WhatsApp masih ada dan sedang menyambung ulang. Tunggu sebentar atau `!warestart`. Untuk login ulang dari awal: `!walogout ya`, lalu `!walogin`.", 409);
    }
    let phone = null;
    if (body.phone) {
      phone = normalizePhone(body.phone);
      if (!phone) throw new ControlError("Nomor tidak valid. Contoh: `!walogin 081234567890`");
      if (expectedPhone && phone !== expectedPhone) {
        throw new ControlError(`Nomor ini bukan nomor CS yang diatur di listener (WA_EXPECTED_PHONE …${expectedPhone.slice(-4)}).`);
      }
    }
    const active = ["connecting", "qr"].includes(wa.state) && wa.login?.source === "discord";
    if (active && (wa.pairing?.phone || null) === phone && !wa.pairing?.error) return statusJson();
    wa.loginError = null;
    wa.login = { source: "discord", startedAt: nowIso() };
    connect({ pairingPhone: phone, fresh: true }).catch(fatal);
    return statusJson();
  },

  "POST /logout": async () => {
    if (!wa.linked) {
      // Cancel a QR that is still showing.
      if (wa.login) {
        stopSocket();
        wa.login = null;
        wa.pairing = null;
        wa.qr = null;
        setState("needs_login");
      }
      return { result: "not_linked" };
    }
    if (socket && wa.state === "open") {
      intentionalLogout = "discord";
      try {
        await socket.logout();
        return { result: "logged_out", phone: wa.phone };
      } catch {
        intentionalLogout = null;
      }
    }
    // Not connected: the linked device stays on the phone, only the keys here
    // are removed.
    stopSocket();
    moveAuthAside();
    intentionalLogout = null;
    setState("needs_login");
    return { result: "local_only", phone: wa.phone };
  },

  "POST /restart": async () => {
    if (!wa.linked) throw new ControlError("WhatsApp listener belum login: pakai `!walogin`.", 409);
    reconnectDelay = 5_000;
    alertedDown = false;
    await connect();
    return statusJson();
  },

  // Waits for the job; the analysis digest still goes to the leads channel.
  "POST /run": async (body) => {
    if (body.job === "analysis") return { job: "analysis", ...(await runJob("analysis", () => runAnalysis("manual"))) };
    if (body.job === "daily") return { job: "daily", ...(await runJob("daily", runDaily)) };
    throw new ControlError("Job tidak dikenal. Pilih `analisa` atau `harian`.");
  },

  // !synccontacts: one batch of leads without a WhatsApp contact (older
  // leads too). !synccontacts <wa>: that lead now.
  "POST /contacts/sync": async (body) => {
    if (!saveContacts) throw new ControlError("Simpan kontak WhatsApp dimatikan di listener (`WA_SAVE_CONTACTS=0`).", 409);
    if (wa.state !== "open") throw new ControlError("WhatsApp listener belum tersambung, jadi kontak belum bisa disimpan. Cek `!wastatus`.", 409);
    const phone = typeof body.wa === "string" && body.wa.trim() ? body.wa.trim().slice(0, 40) : null;
    const summary = await contactSync.run(phone ? { wa: phone, limit: 1 } : { backfill: true, limit: 30 });
    if (summary.result === "busy") throw new ControlError("Kontak sedang disimpan, coba lagi sebentar.", 409);
    if (summary.result === "not_connected") throw new ControlError("WhatsApp listener belum tersambung (atau bukan nomor CS), jadi kontak belum bisa disimpan.", 409);
    return summary;
  },
};

let controlServer = null;
async function startControl() {
  try {
    controlServer = await listenControl(createControlServer(controlRoutes, { log }), SOCKET_PATH);
    log(`control socket siap (${path.relative(here, SOCKET_PATH) || SOCKET_PATH})`);
  } catch (error) {
    log(`control socket gagal dibuka, command Discord !wa... tidak bisa dipakai: ${error.message}`);
  }
}

function fatal(error) {
  log("fatal:", error?.message || error);
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    log(`${signal}: berhenti`);
    try {
      controlServer?.close();
      if (existsSync(SOCKET_PATH)) unlinkSync(SOCKET_PATH);
    } catch {
      // Best effort.
    }
    stopSocket();
    queue.finally(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}

scheduleDaily();
scheduleContacts();
scheduleSupervision();
await startControl();
connect().catch(fatal);
