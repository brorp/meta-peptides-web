// WhatsApp listener commands for the whatsapp-settings channel: status,
// login (QR or pairing code), logout, reconnect, and running the scheduled
// jobs now. They talk to the listener on the same VPS through ctx.wa
// (wa-control.mjs); only !waignored goes through the website API.
import { CommandInputError, assertKnownFields } from "./parser.mjs";

const LOGIN_TIMEOUT_MS = 4 * 60 * 1000;
const POLL_MS = 2000;
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const STATE_TEXT = {
  open: "✅ Tersambung",
  starting: "⏳ Baru dinyalakan",
  connecting: "⏳ Menyambung ke WhatsApp…",
  qr: "📲 Menunggu scan QR / kode pairing",
  reconnecting: "⚠️ Terputus, sedang mencoba tersambung lagi",
  replaced: "⚠️ Terputus: ada listener lain yang memakai sesi yang sama",
  needs_login: "🔴 Belum login",
};

const JOB_TEXT = { analysis: "analisa chat", daily: "tugas harian" };
const RUN_JOBS = { analisa: "analysis", analysis: "analysis", ai: "analysis", harian: "daily", daily: "daily" };

// --- formatting ----------------------------------------------------------

function jakartaParts(iso) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
}

export function jakartaTime(iso) {
  if (!iso) return "-";
  const parts = jakartaParts(iso);
  return `${parts.day}/${parts.month} ${parts.hour}.${parts.minute} WIB`;
}

export function duration(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return `${days}h ${hours}j`;
  if (hours) return `${hours}j ${minutes}m`;
  if (minutes) return `${minutes}m`;
  return `${total}d`;
}

const ago = (iso, now) => (iso ? `${duration((now - Date.parse(iso)) / 1000)} lalu` : "");
const when = (iso, now) => (iso ? `${jakartaTime(iso)} (${ago(iso, now)})` : "belum ada");
const lastDigits = (phone) => `…${String(phone || "").slice(-4)}`;

function wrongNumber(status) {
  const match = /^wrong_number:(\d+)/.exec(status.login_error || "");
  return match ? match[1] : null;
}

function analysisLine(job) {
  if (!job) return "belum jalan sejak listener dinyalakan";
  const parts = [`${job.slot === "manual" ? "manual" : job.slot} • ${jakartaTime(job.at)}`, `${job.items} lead dibaca`, `${job.suggested} usulan`];
  if (job.auto_applied) parts.push(`${job.auto_applied} diterapkan otomatis`);
  if (job.ghosted) parts.push(`${job.ghosted} ghosting`);
  if (job.failed) parts.push(`${job.failed} gagal`);
  if (job.configured === false) parts.push("AI belum disetup");
  if (job.error) parts.push(`⚠️ ${job.error}`);
  return parts.join(" • ");
}

function dailyLine(job) {
  if (!job) return "belum jalan sejak listener dinyalakan";
  const parts = [jakartaTime(job.at)];
  if (job.deleted !== null && job.deleted !== undefined) parts.push(`${job.deleted} chat lama dihapus`);
  if (job.purge_error) parts.push(`⚠️ ${job.purge_error}`);
  if (job.error) parts.push(`⚠️ ${job.error}`);
  return parts.join(" • ");
}

function contactsLine(contacts) {
  if (!contacts) return null;
  if (!contacts.enabled) return "**Kontak WhatsApp**: dimatikan (`WA_SAVE_CONTACTS=0` di listener)";
  const parts = [`${contacts.saved_total || 0} disimpan sejak listener jalan`];
  if (contacts.failed_total) parts.push(`${contacts.failed_total} gagal`);
  if (contacts.running) parts.push("⏳ sedang menyimpan");
  const last = contacts.last;
  if (last?.at) parts.push(`terakhir ${jakartaTime(last.at)}${last.error ? ` ⚠️ ${last.error}` : ""}`);
  return `**Kontak WhatsApp** (lead baru, cek tiap 2 menit): ${parts.join(" • ")}`;
}

// !wastatus. Only counts and times: no chat text, no customer numbers.
export function waStatusText(status, now = Date.now()) {
  const lines = [`📱 **WhatsApp listener** • ${STATE_TEXT[status.state] || status.state}`];

  if (status.state === "open") {
    lines.push(`Nomor: **+${status.phone}**${status.name ? ` (${status.name})` : ""} • tersambung sejak ${when(status.connected_at, now)}`);
  } else if (status.state === "needs_login") {
    const wrong = wrongNumber(status);
    if (wrong) lines.push(`Login terakhir ditolak: nomor ${lastDigits(wrong)} bukan nomor CS, jadi langsung dilepas.`);
    lines.push("Chat WA **tidak** jadi lead otomatis. Ketik `!walogin` untuk menampilkan QR, atau `!walogin 08xx` untuk kode pairing.");
  } else if (status.state === "qr") {
    lines.push("Login sedang berjalan. Ketik `!walogin` kalau QR-nya belum terlihat di channel ini.");
  } else if (status.state === "reconnecting" || status.state === "replaced") {
    const code = status.last_disconnect?.code;
    lines.push(`Terputus sejak ${when(status.since, now)}${code ? ` (kode ${code})` : ""}. Kalau lama tidak pulih: \`!warestart\`.`);
  }

  if (status.expected_phone) {
    lines.push(`Nomor yang diizinkan: ${lastDigits(status.expected_phone)} (nomor lain yang scan langsung dilepas)`);
  } else {
    lines.push("⚠️ `WA_EXPECTED_PHONE` belum diisi di listener: nomor siapa pun yang scan QR akan dibaca.");
  }

  const stats = status.stats || {};
  const counts = [`${stats.messages_in || 0} chat masuk`, `${stats.messages_out || 0} balasan CS`, `${stats.leads_created || 0} lead baru`];
  if (stats.existing_customer_leads) counts.push(`${stats.existing_customer_leads} customer lama`);
  if (stats.failed) counts.push(`⚠️ ${stats.failed} gagal dikirim ke API`);
  lines.push("", `**Sejak listener jalan** (${jakartaTime(stats.started_at)}): ${counts.join(" • ")}`);
  lines.push(`Chat terakhir masuk: ${when(stats.last_message_at, now)} • lead terakhir: ${when(stats.last_lead_at, now)}`);
  if (stats.unresolved_lids) lines.push(`${stats.unresolved_lids} chat tanpa nomor HP (ID samaran) dilewati`);
  if (stats.last_error) lines.push(`Error terakhir (${jakartaTime(stats.last_error.at)}): ${stats.last_error.message}`);

  const jobs = status.jobs || {};
  lines.push("", `**Jadwal**: analisa chat 12.00 & 23.00 WIB, tugas harian 03.00 WIB${jobs.running ? ` • ⏳ ${JOB_TEXT[jobs.running]} sedang berjalan` : ""}`);
  lines.push(`Analisa terakhir: ${analysisLine(jobs.last_analysis)}`);
  lines.push(`Tugas harian terakhir: ${dailyLine(jobs.last_daily)}`);
  const contactLine = contactsLine(status.contacts);
  if (contactLine) lines.push(contactLine);

  const webhooks = status.webhooks || {};
  const proc = status.process || {};
  lines.push(
    "",
    `Webhook: leads ${webhooks.leads ? "✅" : "⚠️ belum diisi"} • settings ${webhooks.settings ? "✅" : "⚠️ belum diisi (peringatan masuk ke channel leads)"}`,
    `Proses: uptime ${duration(proc.uptime_s || 0)} • RAM ${proc.rss_mb ?? "-"} MB • Node ${proc.node || "-"} • Baileys ${proc.baileys || "-"} • WA Web ${proc.wa_version || "-"}`,
  );
  return lines.join("\n");
}

function formatPairingCode(code) {
  const clean = String(code || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

function qrPayload(status) {
  return {
    content: [
      "📲 **Login WhatsApp listener**",
      "Di HP CS: WhatsApp Business → **Settings** → **Linked Devices** → **Link a Device** → scan QR ini.",
      `QR berganti tiap ±20 detik dan pesan ini ikut diperbarui (QR ke-${status.qr.id}). Bisa di-scan sekitar 2,5 menit; setelah itu bot memberi tahu.`,
      "Discord-nya dibuka di HP CS juga? Pakai `!walogin 08xx` (nomor CS) untuk kode pairing.",
    ].join("\n"),
    files: [{ attachment: Buffer.from(status.qr.png_base64, "base64"), name: "whatsapp-login-qr.png" }],
  };
}

function pairingPayload(status) {
  return {
    content: [
      `🔢 **Kode pairing WhatsApp: \`${formatPairingCode(status.pairing.code)}\`** untuk +${status.pairing.phone}`,
      "Di HP itu: ketuk notifikasi WhatsApp untuk menautkan perangkat, atau **Settings** → **Linked Devices** → **Link a Device** → **Link with phone number instead**, lalu masukkan kode ini.",
      "Berlaku sekitar 2 menit.",
    ].join("\n"),
  };
}

function loginFailedText(status) {
  const wrong = wrongNumber(status);
  if (wrong) {
    return `❌ Yang login nomor ${lastDigits(wrong)}, bukan nomor CS (${lastDigits(status.expected_phone)}). Linked device itu sudah dilepas dan chat-nya tidak dibaca. Ulangi \`!walogin\` dan scan dari HP CS.`;
  }
  if (status.pairing?.error) {
    return `❌ Kode pairing gagal dibuat: ${status.pairing.error}. Coba lagi, atau pakai QR: \`!walogin\` tanpa nomor.`;
  }
  if (status.login_error === "expired") {
    return "⌛ QR / kode pairing kedaluwarsa sebelum dipakai. Ketik `!walogin` lagi kalau sudah siap scan.";
  }
  return `❌ Login gagal (koneksi ke WhatsApp tertutup${status.last_disconnect?.code ? `, kode ${status.last_disconnect.code}` : ""}). Coba \`!walogin\` lagi; kalau terus gagal, cek log VPS.`;
}

function connectedText(status) {
  return `✅ WhatsApp listener tersambung sebagai **+${status.phone}**${status.name ? ` (${status.name})` : ""}. Chat baru otomatis jadi lead.`;
}

// --- handlers --------------------------------------------------------------

function rejectFields(ctx) {
  assertKnownFields(ctx.parsed, [], ctx.name);
}

function rejectArgument(ctx) {
  if (ctx.parsed.argumentText) {
    throw new CommandInputError(`${ctx.name} tidak memakai teks setelah nama command.`);
  }
}

async function handleWaStatus(ctx) {
  rejectFields(ctx);
  rejectArgument(ctx);
  await ctx.reply(waStatusText(await ctx.wa.status(), (ctx.now || Date.now)()));
}

// One login at a time: a second !walogin would only show the same QR twice.
let loginRunning = false;

async function handleWaLogin(ctx) {
  rejectFields(ctx);
  const sleep = ctx.sleep || defaultSleep;
  const now = ctx.now || Date.now;
  const phone = ctx.parsed.argumentText.replace(/\s+/g, "") || null;
  if (loginRunning) {
    await ctx.reply("⏳ Login sedang berjalan: lihat QR atau kode pairing di pesan sebelumnya.");
    return;
  }

  loginRunning = true;
  let shown = null;
  let shownKey = null;
  const clear = async () => {
    await shown?.delete().catch(() => {});
    shown = null;
  };
  try {
    let status = await ctx.wa.login(phone);
    const deadline = now() + LOGIN_TIMEOUT_MS;
    for (;;) {
      if (status.state === "open") {
        await clear();
        await ctx.reply(connectedText(status));
        return;
      }
      if (status.state === "needs_login" || status.pairing?.error) {
        await clear();
        await ctx.reply(loginFailedText(status));
        return;
      }
      // Only the newest QR or code is shown; the old one is replaced.
      const key = phone ? status.pairing?.code : status.qr?.id;
      if (key && key !== shownKey) {
        const payload = phone ? pairingPayload(status) : qrPayload(status);
        if (shown) {
          await shown.edit({ ...payload, attachments: [] }).catch(async () => {
            shown = await ctx.post(payload);
          });
        } else {
          shown = await ctx.post(payload);
        }
        shownKey = key;
      }
      if (now() >= deadline) {
        await clear();
        await ctx.reply("⌛ Login belum selesai setelah 4 menit, QR / kode sudah tidak ditampilkan. Ketik `!walogin` lagi kalau sudah siap.");
        return;
      }
      await sleep(POLL_MS);
      status = await ctx.wa.status();
    }
  } catch (error) {
    await clear();
    throw error;
  } finally {
    loginRunning = false;
  }
}

async function handleWaLogout(ctx) {
  rejectFields(ctx);
  if (ctx.parsed.argumentText.toLowerCase() !== "ya") {
    throw new CommandInputError(
      "Ini melepas linked device WhatsApp listener: chat baru berhenti jadi lead otomatis sampai login lagi. Kalau yakin, ketik `!walogout ya`.",
    );
  }
  const data = await ctx.wa.logout();
  if (data.result === "logged_out") {
    await ctx.reply(`🔌 WhatsApp listener logout dari **+${data.phone}**. Perangkat "MetaWellness Leads" hilang dari Linked Devices di HP. Chat baru tidak jadi lead otomatis sampai \`!walogin\` lagi.`);
  } else if (data.result === "local_only") {
    await ctx.reply("🔌 Sesi di VPS sudah dihapus, tapi listener sedang tidak tersambung, jadi perangkatnya mungkin masih terlihat di HP. Hapus manual: WhatsApp → Settings → Linked Devices → MetaWellness Leads → Log out. Login lagi dengan `!walogin`.");
  } else {
    await ctx.reply("ℹ️ WhatsApp listener memang belum login (QR yang sedang tampil, kalau ada, dibatalkan).");
  }
}

async function handleWaRestart(ctx) {
  rejectFields(ctx);
  rejectArgument(ctx);
  const sleep = ctx.sleep || defaultSleep;
  let status = await ctx.wa.restart();
  for (let attempt = 0; attempt < 10 && status.state !== "open"; attempt += 1) {
    if (status.state === "needs_login") break;
    await sleep(POLL_MS);
    status = await ctx.wa.status();
  }
  if (status.state === "open") await ctx.reply(`🔄 ${connectedText(status)}`);
  else if (status.state === "needs_login") await ctx.reply("⚠️ Sesi WhatsApp sudah tidak berlaku (linked device dilepas). Login lagi dengan `!walogin`.");
  else await ctx.reply(`⚠️ Belum tersambung (${STATE_TEXT[status.state] || status.state}). Cek lagi sebentar dengan \`!wastatus\`.`);
}

export function runResultText(result) {
  if (result.job === "daily") {
    const parts = [];
    if (result.deleted !== null && result.deleted !== undefined) parts.push(`${result.deleted} chat lama (lebih dari 90 hari) dihapus`);
    const lines = [`🧹 Tugas harian selesai${parts.length ? `: ${parts.join(" • ")}` : "."}`];
    if (result.purge_error) lines.push(`⚠️ ${result.purge_error}`);
    if (result.error) lines.push(`⚠️ ${result.error}`);
    return lines.join("\n");
  }
  const parts = [`${result.items} lead dibaca`, `${result.suggested} usulan`];
  if (result.auto_applied) parts.push(`${result.auto_applied} diterapkan otomatis`);
  if (result.ghosted) parts.push(`${result.ghosted} ghosting`);
  if (result.failed) parts.push(`${result.failed} gagal`);
  const lines = [`🧠 Analisa chat selesai: ${parts.join(" • ")}.`];
  if (result.configured === false) {
    const why = result.setup_error ? ` ${result.setup_error}` : " Isi `FREELLMAPI_BASE_URL` + `FREELLMAPI_API_KEY` (atau `ANTHROPIC_API_KEY`) di Vercel.";
    lines.push(`ℹ️ AI belum jalan, jadi hanya aturan ghosting yang dipakai.${why}`);
  }
  if (result.error) lines.push(`⚠️ ${result.error}`);
  if (result.items || result.ghosted) lines.push("Rincian per lead ada di channel WhatsApp Leads.");
  return lines.join("\n");
}

async function handleWaRun(ctx) {
  rejectFields(ctx);
  const job = RUN_JOBS[ctx.parsed.argumentText.toLowerCase()];
  if (!job) throw new CommandInputError("Pilih job: `!warun analisa` (analisa chat AI + ghosting) atau `!warun harian` (hapus chat lama).");
  await ctx.reply(job === "analysis" ? "⏳ Analisa chat dimulai, bisa beberapa menit…" : "⏳ Tugas harian dimulai…");
  await ctx.reply(runResultText(await ctx.wa.run(job)));
}

// !synccontacts: older leads without a WhatsApp contact, one batch of 30
// (new leads are saved by the listener by themselves). !synccontacts <wa>:
// that lead now.
async function handleSyncContacts(ctx) {
  rejectFields(ctx);
  const wa = ctx.parsed.argumentText;
  if (!wa) await ctx.reply("⏳ Menyimpan lead lama ke kontak WhatsApp, pelan-pelan (sekitar 3 detik per kontak)…");
  const result = await ctx.wa.contacts(wa || null);
  await ctx.reply(syncContactsText(result, wa));
}

export function syncContactsText(result, wa) {
  if (wa) {
    const lead = result.lead ? `**${result.lead.full_name}** (${result.lead.whatsapp_phone})` : wa;
    if (result.saved) return `📇 ${lead}: tersimpan di kontak WhatsApp sebagai **${result.items[0]?.name}**.`;
    return `⚠️ ${lead}: gagal disimpan ke kontak WhatsApp. ${result.error || ""}`.trim();
  }
  const lines = [`📇 Kontak WhatsApp: **${result.saved}** disimpan${result.failed ? `, **${result.failed}** gagal` : ""}.`];
  if (result.remaining) lines.push(`Masih ${result.remaining} lead belum jadi kontak: jalankan \`!synccontacts\` lagi.`);
  else if (!result.error) lines.push("Semua lead (selain status skip) sudah jadi kontak.");
  if (result.error) lines.push(`⚠️ ${result.error}`);
  return lines.join("\n");
}

async function handleWaIgnored(ctx) {
  rejectFields(ctx);
  rejectArgument(ctx);
  const data = await ctx.api.get("/api/bot/whatsapp/ignored");
  const items = data.items || [];
  if (!items.length) {
    await ctx.reply("ℹ️ Belum ada nomor yang diabaikan. Tambah dengan `!ignorewa <wa>`.");
    return;
  }
  const lines = [`🔕 **Nomor WA yang diabaikan** (${data.total ?? items.length}):`];
  for (const item of items) {
    const meta = [item.added_by && `oleh ${item.added_by}`, item.created_at && jakartaTime(item.created_at).replace(/ \d\d\.\d\d WIB$/, "")].filter(Boolean).join(", ");
    lines.push(`• ${item.phone}${item.note ? ` — ${item.note}` : ""}${meta ? ` (${meta})` : ""}`);
  }
  if ((data.total ?? items.length) > items.length) lines.push(`…dan ${data.total - items.length} lainnya.`);
  lines.push("Hapus dari daftar: `!unignorewa <wa>`.");
  await ctx.reply(lines.join("\n"));
}

// --- specs -----------------------------------------------------------------

const SETTINGS_NOTE = "Butuh WhatsApp listener jalan di VPS yang sama dengan bot (lihat whatsapp-listener/README.md).";

export const WA_SETTINGS_SPECS = {
  "!wastatus": {
    group: "WhatsApp",
    waSettingsOnly: true,
    usage: "!wastatus",
    summary: "Status WhatsApp listener: tersambung atau tidak, nomor, chat & lead terakhir, hasil analisa terakhir",
    positional: false,
    example: { firstLine: "!wastatus" },
    fields: [],
    notes: ["Hanya jumlah dan waktu, tanpa isi chat. Hitungan mulai dari 0 setiap listener dinyalakan ulang.", SETTINGS_NOTE],
    handler: handleWaStatus,
  },
  "!walogin": {
    group: "WhatsApp",
    waSettingsOnly: true,
    usage: "!walogin [wa]",
    summary: "Login WhatsApp listener: tampilkan QR di channel ini, atau kode pairing kalau pakai nomor",
    argument: "nomor WA CS (opsional): kalau diisi, keluar kode pairing 8 huruf, bukan QR",
    example: { firstLine: "!walogin" },
    fields: [],
    notes: [
      "QR: di HP CS buka WhatsApp Business → Settings → Linked Devices → Link a Device, lalu scan QR di channel ini (Discord dibuka di laptop/HP lain). QR diperbarui otomatis dan dihapus begitu login berhasil atau kedaluwarsa.",
      "Kode pairing (`!walogin 0812…`): untuk kalau Discord dibuka di HP CS itu sendiri. Masukkan kode lewat Link a Device → Link with phone number instead.",
      "Yang scan/memasukkan kode menentukan nomor yang dibaca listener. Kalau `WA_EXPECTED_PHONE` diisi di listener, nomor lain langsung dilepas.",
      SETTINGS_NOTE,
    ],
    handler: handleWaLogin,
  },
  "!walogout": {
    group: "WhatsApp",
    waSettingsOnly: true,
    usage: "!walogout ya",
    summary: "Lepas linked device WhatsApp listener (misalnya untuk ganti nomor CS)",
    argument: "`ya` untuk konfirmasi",
    example: { firstLine: "!walogout ya" },
    fields: [],
    notes: ["Setelah logout, chat baru tidak jadi lead otomatis sampai `!walogin` lagi. Lead dan chat yang sudah tersimpan tidak dihapus."],
    handler: handleWaLogout,
  },
  "!warestart": {
    group: "WhatsApp",
    waSettingsOnly: true,
    usage: "!warestart",
    summary: "Sambungkan ulang WhatsApp listener ke WhatsApp (tanpa scan ulang)",
    positional: false,
    example: { firstLine: "!warestart" },
    fields: [],
    notes: ["Untuk kalau `!wastatus` lama menunjukkan terputus. Sesi tetap sama, tidak perlu scan QR."],
    handler: handleWaRestart,
  },
  "!warun": {
    group: "WhatsApp",
    waSettingsOnly: true,
    usage: "!warun <analisa|harian>",
    summary: "Jalankan sekarang analisa chat AI (biasanya 12.00/23.00) atau tugas harian (03.00)",
    argument: "`analisa` atau `harian`",
    example: { firstLine: "!warun analisa" },
    fields: [],
    notes: [
      "`analisa`: semua lead dengan chat baru dinilai AI + aturan ghosting, rinciannya dikirim ke channel WhatsApp Leads seperti jadwal biasa. Memakai kredit Claude API.",
      "`harian`: hapus chat yang lebih dari 90 hari.",
    ],
    handler: handleWaRun,
  },
  "!waignored": {
    group: "WhatsApp",
    usage: "!waignored",
    summary: "Daftar nomor WA yang diabaikan (!ignorewa)",
    positional: false,
    example: { firstLine: "!waignored" },
    fields: [],
    notes: ["Menampilkan 50 terbaru."],
    handler: handleWaIgnored,
  },
  "!synccontacts": {
    group: "WhatsApp",
    usage: "!synccontacts [wa]",
    summary: "Simpan lead ke kontak WhatsApp CS (nama lead muncul di WhatsApp, bukan nomor)",
    argument: "nomor WA lead (opsional)",
    example: { firstLine: "!synccontacts" },
    fields: [],
    notes: [
      "Lead baru (14 hari terakhir) dan lead yang namanya diubah otomatis disimpan oleh WhatsApp listener, jadi ini terutama untuk lead lama dan kalau ada yang gagal.",
      "Tanpa nomor: 30 lead lama yang belum jadi kontak per sekali jalan (sekitar 3 detik per kontak). Jalankan lagi sampai habis.",
      "Dengan nomor: kontak lead itu disimpan ulang sekarang, termasuk kalau kontaknya pernah dihapus di HP atau statusnya skip.",
      "Nama kontak: `<nama> • Lead <origin> <tgl chat>`, misalnya `Budi • Lead Ads 06/11`. Customer lama: `<nama> • Customer <tgl>`.",
      "Kontak tersimpan di akun WhatsApp saja (tidak masuk kontak iPhone). Butuh WhatsApp listener tersambung.",
    ],
    handler: handleSyncContacts,
  },
};
