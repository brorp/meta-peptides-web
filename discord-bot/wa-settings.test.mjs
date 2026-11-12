import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { COMMAND_SPECS, getCommandSpec } from "./commands.mjs";
import { buildHelpIndex } from "./help.mjs";
import { CommandInputError, parseCommandMessage } from "./parser.mjs";
import { WaControlError, createWaControl } from "./wa-control.mjs";
import { duration, jakartaTime, runResultText, waStatusText } from "./wa-settings.mjs";

const NOW = Date.parse("2026-11-12T05:00:00Z"); // 12.00 WIB
const PNG = Buffer.from("fake-png").toString("base64");

function status(overrides = {}) {
  return {
    state: "open",
    since: "2026-11-12T02:00:00Z",
    linked: true,
    phone: "6281111111111",
    name: "MetaPeptides CS",
    expected_phone: "6281111111111",
    connected_at: "2026-11-12T02:00:00Z",
    last_disconnect: null,
    login: null,
    login_error: null,
    qr: null,
    pairing: null,
    stats: {
      started_at: "2026-11-12T01:59:00Z",
      messages_in: 48,
      messages_out: 30,
      leads_created: 6,
      existing_customer_leads: 1,
      failed: 0,
      unresolved_lids: 0,
      last_message_at: "2026-11-12T04:58:00Z",
      last_lead_at: "2026-11-12T04:30:00Z",
      last_error: null,
    },
    jobs: { running: null, last_analysis: null, last_daily: null },
    process: { uptime_s: 10900, rss_mb: 132, node: "v22.11.0", baileys: "7.0.0-rc14", wa_version: "2.3000.1" },
    webhooks: { leads: true, settings: true },
    ...overrides,
  };
}

// Runs a command with a fake listener (wa) and fake Discord messages.
async function run(content, wa, { api = {}, maxPolls = 400 } = {}) {
  const parsed = parseCommandMessage(content, getCommandSpec);
  const spec = COMMAND_SPECS[parsed.command];
  const replies = [];
  const posts = [];
  const calls = [];
  let clock = NOW;
  let polls = 0;
  const reply = async (text) => replies.push(text);
  await spec.handler({
    parsed,
    name: parsed.command,
    spec,
    reply,
    send: reply,
    post: async (payload) => {
      const message = {
        payload,
        edits: [],
        deleted: false,
        edit: async (next) => message.edits.push(next),
        delete: async () => {
          message.deleted = true;
        },
      };
      posts.push(message);
      return message;
    },
    wa: new Proxy(wa, {
      get: (target, key) => async (...args) => {
        calls.push([key, ...args]);
        if (typeof target[key] !== "function") throw new Error(`unexpected wa.${String(key)}`);
        return target[key](...args);
      },
    }),
    api: {
      get: async (route) => {
        calls.push(["GET", route]);
        return api[`GET ${route}`];
      },
    },
    now: () => clock,
    sleep: async (ms) => {
      polls += 1;
      if (polls > maxPolls) throw new Error("too many polls");
      clock += ms;
    },
  });
  return { replies, posts, calls };
}

test("WhatsApp settings commands are listed and locked to the settings channel", () => {
  for (const name of ["!wastatus", "!walogin", "!walogout", "!warestart", "!warun"]) {
    assert.equal(COMMAND_SPECS[name].waSettingsOnly, true, name);
    assert.equal(COMMAND_SPECS[name].group, "WhatsApp");
  }
  assert.equal(COMMAND_SPECS["!waignored"].waSettingsOnly, undefined);
  assert.equal(COMMAND_SPECS["!ignorewa"].group, "WhatsApp");
  const index = buildHelpIndex(COMMAND_SPECS);
  assert.match(index, /\*\*WhatsApp \(🔒 = khusus channel whatsapp-settings\)\*\*/);
  assert.match(index, /`!walogin \[wa\]` 🔒 —/);
  assert.match(index, /`!ignorewa <wa>` —/);
});

test("time helpers", () => {
  assert.equal(jakartaTime("2026-11-12T02:05:00Z"), "12/11 09.05 WIB");
  assert.equal(jakartaTime(null), "-");
  assert.equal(duration(42), "42d");
  assert.equal(duration(125), "2m");
  assert.equal(duration(10900), "3j 1m");
  assert.equal(duration(90000), "1h 1j");
});

test("!wastatus shows connection, counts and jobs without chat content", async () => {
  const text = waStatusText(
    status({
      jobs: {
        running: null,
        last_analysis: { slot: "12.00", at: "2026-11-12T05:04:00Z", items: 14, suggested: 3, auto_applied: 0, failed: 0, ghosted: 2, configured: true, error: null },
        last_daily: { at: "2026-11-11T20:01:00Z", deleted: 120 },
      },
      contacts: { enabled: true, running: false, saved_total: 7, failed_total: 1, last: { at: "2026-11-12T04:58:00Z", saved: 1, failed: 0, error: null } },
    }),
    NOW,
  );
  assert.match(text, /✅ Tersambung/);
  assert.match(text, /\*\*\+6281111111111\*\* \(MetaPeptides CS\) • tersambung sejak 12\/11 09\.00 WIB \(3j 0m lalu\)/);
  assert.match(text, /48 chat masuk • 30 balasan CS • 6 lead baru • 1 customer lama/);
  assert.match(text, /Chat terakhir masuk: 12\/11 11\.58 WIB \(2m lalu\)/);
  assert.match(text, /Analisa terakhir: 12\.00 • 12\/11 12\.04 WIB • 14 lead dibaca • 3 usulan • 2 ghosting/);
  assert.match(text, /Tugas harian terakhir: 12\/11 03\.01 WIB • 120 chat lama dihapus\n/);
  assert.match(text, /\*\*Kontak WhatsApp\*\* \(lead baru, cek tiap 2 menit\): 7 disimpan sejak listener jalan • 1 gagal • terakhir 12\/11 11\.58 WIB/);
  assert.match(waStatusText(status({ contacts: { enabled: false } }), NOW), /Kontak WhatsApp\*\*: dimatikan \(`WA_SAVE_CONTACTS=0`/);
  assert.match(text, /Nomor yang diizinkan: …1111/);
  assert.match(text, /Baileys 7\.0\.0-rc14/);

  const down = waStatusText(
    status({ state: "needs_login", phone: null, expected_phone: null, login_error: "wrong_number:6289999999999", webhooks: { leads: true, settings: false } }),
    NOW,
  );
  assert.match(down, /🔴 Belum login/);
  assert.match(down, /nomor …9999 bukan nomor CS/);
  assert.match(down, /`!walogin`/);
  assert.match(down, /WA_EXPECTED_PHONE` belum diisi/);
  assert.match(down, /settings ⚠️ belum diisi/);

  const reconnecting = waStatusText(status({ state: "reconnecting", since: "2026-11-12T04:50:00Z", last_disconnect: { code: 428 } }), NOW);
  assert.match(reconnecting, /Terputus sejak 12\/11 11\.50 WIB \(10m lalu\) \(kode 428\)/);

  const { replies, calls } = await run("!wastatus", { status: async () => status() });
  assert.deepEqual(calls, [["status"]]);
  assert.match(replies[0], /Tersambung/);
});

test("!walogin posts the QR, replaces it when it changes, and deletes it once linked", async () => {
  const states = [
    status({ state: "qr", linked: false, phone: null, qr: { id: 2, at: "x", png_base64: PNG } }),
    status({ state: "qr", linked: false, phone: null, qr: { id: 3, at: "x", png_base64: PNG } }),
    status({ state: "connecting", linked: true, phone: null }),
    status(),
  ];
  const wa = {
    login: async (phone) => {
      assert.equal(phone, null);
      return status({ state: "connecting", linked: false, phone: null });
    },
    status: async () => states.shift(),
  };
  const { replies, posts, calls } = await run("!walogin", wa);
  assert.deepEqual(calls.map((call) => call[0]), ["login", "status", "status", "status", "status"]);
  assert.equal(posts.length, 1);
  const [message] = posts;
  assert.match(message.payload.content, /Linked Devices.*Link a Device/);
  assert.match(message.payload.content, /QR ke-2/);
  assert.equal(message.payload.files[0].name, "whatsapp-login-qr.png");
  assert.equal(message.payload.files[0].attachment.toString(), "fake-png");
  // The new QR replaces the old attachment.
  assert.equal(message.edits.length, 1);
  assert.deepEqual(message.edits[0].attachments, []);
  assert.match(message.edits[0].content, /QR ke-3/);
  assert.equal(message.deleted, true);
  assert.deepEqual(replies, ["✅ WhatsApp listener tersambung sebagai **+6281111111111** (MetaPeptides CS). Chat baru otomatis jadi lead."]);
});

test("!walogin <wa> shows a pairing code instead of a QR", async () => {
  const states = [
    status({ state: "qr", linked: false, qr: { id: 1, png_base64: PNG }, pairing: { phone: "6281111111111", code: "ABCD1234", error: null } }),
    status({ state: "needs_login", linked: false, login_error: "expired" }),
  ];
  const { replies, posts, calls } = await run("!walogin 0811 1111 1111", {
    login: async () => status({ state: "connecting", linked: false, pairing: { phone: "6281111111111", code: null, error: null } }),
    status: async () => states.shift(),
  });
  assert.deepEqual(calls[0], ["login", "081111111111"]);
  assert.equal(posts.length, 1);
  assert.match(posts[0].payload.content, /Kode pairing WhatsApp: `ABCD-1234`\*\* untuk \+6281111111111/);
  assert.equal(posts[0].payload.files, undefined);
  assert.equal(posts[0].deleted, true);
  assert.match(replies[0], /kedaluwarsa/);
});

test("!walogin explains a rejected number, a pairing error and a timeout", async () => {
  let result = await run("!walogin", {
    login: async () => status({ state: "connecting", linked: false }),
    status: async () => status({ state: "needs_login", linked: false, login_error: "wrong_number:6289999999999" }),
  });
  assert.match(result.replies[0], /nomor …9999, bukan nomor CS \(…1111\)/);

  result = await run("!walogin 0811", {
    login: async () => status({ state: "qr", linked: false, pairing: { phone: "62811", code: null, error: "Connection Closed" } }),
  });
  assert.match(result.replies[0], /Kode pairing gagal dibuat: Connection Closed/);

  result = await run("!walogin", {
    login: async () => status({ state: "qr", linked: false, qr: { id: 1, png_base64: PNG } }),
    status: async () => status({ state: "qr", linked: false, qr: { id: 1, png_base64: PNG } }),
  });
  assert.equal(result.posts.length, 1);
  assert.equal(result.posts[0].deleted, true);
  assert.match(result.replies[0], /belum selesai setelah 4 menit/);
});

test("!walogin errors from the listener reach the user and free the lock", async () => {
  await assert.rejects(
    run("!walogin", { login: async () => { throw new WaControlError("Sudah tersambung sebagai +62811."); } }),
    /Sudah tersambung/,
  );
  // Not stuck in "login sedang berjalan" after the error.
  const { replies } = await run("!walogin", {
    login: async () => status({ state: "open" }),
  });
  assert.match(replies[0], /tersambung sebagai/);
});

test("!walogout needs `ya` and explains each result", async () => {
  await assert.rejects(run("!walogout", { logout: async () => ({}) }), CommandInputError);
  let result = await run("!walogout ya", { logout: async () => ({ result: "logged_out", phone: "6281111111111" }) });
  assert.match(result.replies[0], /logout dari \*\*\+6281111111111\*\*/);
  result = await run("!walogout YA", { logout: async () => ({ result: "local_only", phone: "6281111111111" }) });
  assert.match(result.replies[0], /Hapus manual/);
  result = await run("!walogout ya", { logout: async () => ({ result: "not_linked" }) });
  assert.match(result.replies[0], /memang belum login/);
});

test("!warestart waits for the connection", async () => {
  const states = [status({ state: "connecting" }), status()];
  let result = await run("!warestart", { restart: async () => status({ state: "connecting" }), status: async () => states.shift() });
  assert.match(result.replies[0], /🔄 ✅ WhatsApp listener tersambung/);
  result = await run("!warestart", { restart: async () => status({ state: "connecting" }), status: async () => status({ state: "reconnecting" }) });
  assert.match(result.replies[0], /Belum tersambung/);
  assert.equal(result.calls.length, 11);
});

test("!warun runs a job and summarises it", async () => {
  await assert.rejects(run("!warun", {}), /Pilih job/);
  let result = await run("!warun analisa", {
    run: async (job) => {
      assert.equal(job, "analysis");
      return { job: "analysis", items: 5, suggested: 2, auto_applied: 1, failed: 0, ghosted: 1, configured: true, error: null };
    },
  });
  assert.match(result.replies[0], /Analisa chat dimulai/);
  assert.equal(result.replies[1], "🧠 Analisa chat selesai: 5 lead dibaca • 2 usulan • 1 diterapkan otomatis • 1 ghosting.\nRincian per lead ada di channel WhatsApp Leads.");
  result = await run("!warun harian", {
    run: async (job) => ({ job, deleted: 12, purge_error: null }),
  });
  assert.equal(result.replies[1], "🧹 Tugas harian selesai: 12 chat lama (lebih dari 90 hari) dihapus");
  assert.match(runResultText({ job: "analysis", items: 0, suggested: 0, ghosted: 0, configured: false }), /AI belum jalan.*FREELLMAPI_BASE_URL/);
  assert.match(
    runResultText({ job: "analysis", items: 0, suggested: 0, ghosted: 0, configured: false, setup_error: "FREELLMAPI_BASE_URL harus https://" }),
    /AI belum jalan.*harus https/,
  );
});

test("!synccontacts saves older leads (one batch) or one lead through the listener", async () => {
  let result = await run("!synccontacts", {
    contacts: async (wa) => {
      assert.equal(wa, null);
      return { result: "done", saved: 28, failed: 2, remaining: 15, error: "bad-request", items: [] };
    },
  });
  assert.match(result.replies[0], /⏳ Menyimpan lead lama ke kontak WhatsApp/);
  assert.equal(result.replies[1], "📇 Kontak WhatsApp: **28** disimpan, **2** gagal.\nMasih 15 lead belum jadi kontak: jalankan `!synccontacts` lagi.\n⚠️ bad-request");
  result = await run("!synccontacts", { contacts: async () => ({ result: "done", saved: 3, failed: 0, remaining: 0, error: null, items: [] }) });
  assert.equal(result.replies[1], "📇 Kontak WhatsApp: **3** disimpan.\nSemua lead (selain status skip) sudah jadi kontak.");

  result = await run("!synccontacts 081234567890", {
    contacts: async (wa) => {
      assert.equal(wa, "081234567890");
      return { result: "done", saved: 1, failed: 0, lead: { full_name: "Budi", whatsapp_phone: "6281234567890" }, items: [{ name: "Budi • Lead Ads 06/11", ok: true }] };
    },
  });
  assert.deepEqual(result.replies, ["📇 **Budi** (6281234567890): tersimpan di kontak WhatsApp sebagai **Budi • Lead Ads 06/11**."]);
  result = await run("!synccontacts 081234567890", {
    contacts: async () => ({ result: "done", saved: 0, failed: 1, error: "bad-request", lead: { full_name: "Budi", whatsapp_phone: "6281234567890" }, items: [] }),
  });
  assert.equal(result.replies[0], "⚠️ **Budi** (6281234567890): gagal disimpan ke kontak WhatsApp. bad-request");
  assert.equal(COMMAND_SPECS["!synccontacts"].group, "WhatsApp");
  assert.equal(COMMAND_SPECS["!synccontacts"].waSettingsOnly, undefined, "CS can use it in any bot channel");
});

test("!waignored lists ignored numbers", async () => {
  let result = await run("!waignored", {}, {
    api: { "GET /api/bot/whatsapp/ignored": { items: [{ phone: "6281234567890", note: "supplier botol", added_by: "ryan", created_at: "2026-11-11T03:00:00Z" }], total: 1 } },
  });
  assert.match(result.replies[0], /• 6281234567890 — supplier botol \(oleh ryan, 11\/11\)/);
  result = await run("!waignored", {}, { api: { "GET /api/bot/whatsapp/ignored": { items: [], total: 0 } } });
  assert.match(result.replies[0], /Belum ada nomor/);
});

test("createWaControl talks JSON over the listener socket and explains failures", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "bot-"));
  const socketPath = path.join(dir, "c.sock");
  const missing = createWaControl({ socketPath: path.join(dir, "none.sock") });
  await assert.rejects(missing.status(), /tidak jalan di VPS ini/);

  const seen = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      seen.push(`${req.method} ${req.url} ${raw}`);
      if (req.url === "/login") {
        res.writeHead(409, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Sudah tersambung" }));
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ state: "open" }));
    });
  });
  await new Promise((resolve) => server.listen(socketPath, resolve));
  t.after(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const wa = createWaControl({ socketPath });
  assert.deepEqual(await wa.status(), { state: "open" });
  await assert.rejects(wa.login("62811"), (error) => error instanceof WaControlError && error.status === 409 && error.message === "Sudah tersambung");
  assert.deepEqual(await wa.run("daily"), { state: "open" });
  assert.deepEqual(seen, ["GET /status ", 'POST /login {"phone":"62811"}', 'POST /run {"job":"daily"}']);
});
