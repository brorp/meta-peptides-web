import assert from "node:assert/strict";
import test from "node:test";
import { createContactSync, jidOf } from "./contacts.mjs";

const AS_OF = "2026-11-12T05:00:00.000Z";
const item = (n, extra = {}) => ({ lead_id: `lead-${n}`, phone: `62812345000${n}`, name: `Lead ${n} • Lead Ads 12/11`, previous_phone: null, ...extra });

function setup({ items = [], remaining = null, lead = null, failOn = {}, ready = true } = {}) {
  const calls = [];
  const posts = [];
  const sleeps = [];
  const sock = {
    addOrEditContact: async (jid, contact) => {
      calls.push(["add", jid, contact]);
      if (failOn[jid]) throw new Error(failOn[jid]);
    },
    removeContact: async (jid) => calls.push(["remove", jid]),
    signalRepository: { lidMapping: { getLIDForPN: async (jid) => (jid === jidOf("628123450001") ? "1234567@lid" : null) } },
  };
  const env = { ready, sock };
  const sync = createContactSync({
    api: async (route, json) => {
      posts.push([route, json]);
      if (route.endsWith("/pending")) return { as_of: AS_OF, items, remaining, lead };
      return { saved: json.results.filter((r) => r.ok).length };
    },
    getSocket: () => env.sock,
    isReady: () => env.ready,
    sleep: async (ms) => sleeps.push(ms),
    delayMs: 3000,
  });
  return { sync, calls, posts, sleeps, env };
}

test("saves each lead as a WhatsApp-only contact, spaced out, and reports back", async () => {
  const { sync, calls, posts, sleeps } = setup({ items: [item(1), item(2, { previous_phone: "628999" })] });
  const summary = await sync.run();
  assert.deepEqual(posts[0], ["/api/bot/whatsapp/contacts/pending", { limit: 10, backfill: false }]);
  assert.deepEqual(calls, [
    ["add", "628123450001@s.whatsapp.net", { fullName: "Lead 1 • Lead Ads 12/11", firstName: "Lead 1 • Lead Ads 12/11", saveOnPrimaryAddressbook: false, lidJid: "1234567@lid" }],
    ["remove", "628999@s.whatsapp.net"],
    ["add", "628123450002@s.whatsapp.net", { fullName: "Lead 2 • Lead Ads 12/11", firstName: "Lead 2 • Lead Ads 12/11", saveOnPrimaryAddressbook: false }],
  ]);
  assert.deepEqual(sleeps, [3000], "a pause between writes, none before the first");
  assert.deepEqual(posts[1], [
    "/api/bot/whatsapp/contacts/result",
    {
      as_of: AS_OF,
      results: [
        { lead_id: "lead-1", ok: true, name: "Lead 1 • Lead Ads 12/11", phone: "628123450001" },
        { lead_id: "lead-2", ok: true, name: "Lead 2 • Lead Ads 12/11", phone: "628123450002" },
      ],
    },
  ]);
  assert.equal(summary.saved, 2);
  assert.equal(sync.state.savedTotal, 2);
  assert.equal(sync.state.last.saved, 2);
});

test("a failed lead is reported; 'not ready yet' errors are retried later without recording", async () => {
  const failed = setup({ items: [item(1), item(2)], failOn: { [jidOf("628123450001")]: "bad-request" } });
  const summary = await failed.sync.run({ backfill: true, limit: 30 });
  assert.deepEqual(failed.posts[0][1], { limit: 30, backfill: true });
  assert.deepEqual(failed.posts[1][1].results.map((r) => [r.lead_id, r.ok, r.error ?? null]), [["lead-1", false, "bad-request"], ["lead-2", true, null]]);
  assert.deepEqual([summary.saved, summary.failed, summary.error], [1, 1, "bad-request"]);

  const early = setup({ items: [item(1), item(2)], failOn: { [jidOf("628123450001")]: "App state key not present!" } });
  const notReady = await early.sync.run();
  assert.equal(early.posts.length, 1, "nothing recorded: the lead is not to blame");
  assert.equal(early.calls.length, 1, "stops at the first one");
  assert.match(notReady.error, /belum siap menyimpan kontak/);
});

test("not connected, busy, disconnected mid-way, backfill count, one lead", async () => {
  const offline = setup({ items: [item(1)], ready: false });
  assert.deepEqual(await offline.sync.run(), { result: "not_connected" });
  assert.equal(offline.posts.length, 0);

  const busy = setup({ items: [item(1)] });
  const first = busy.sync.run();
  assert.deepEqual(await busy.sync.run(), { result: "busy" });
  await first;

  const drop = setup({ items: [item(1), item(2)] });
  drop.env.sock.addOrEditContact = async (jid, contact) => {
    drop.calls.push(["add", jid, contact]);
    drop.env.ready = false;
  };
  const partial = await drop.sync.run();
  assert.equal(partial.saved, 1);
  assert.match(partial.error, /terputus/);
  assert.equal(drop.posts[1][1].results.length, 1, "the saved one is still recorded");

  const backfill = setup({ items: [item(1), item(2)], remaining: 40 });
  assert.equal((await backfill.sync.run({ backfill: true })).remaining, 38);

  const one = setup({ items: [item(1)], lead: { whatsapp_phone: "628123450001", full_name: "Lead 1" } });
  const single = await one.sync.run({ wa: "08123450001", limit: 1 });
  assert.deepEqual(one.posts[0][1], { limit: 1, backfill: false, wa: "08123450001" });
  assert.deepEqual(single.lead, { whatsapp_phone: "628123450001", full_name: "Lead 1" });

  const quiet = setup({ items: [] });
  await quiet.sync.run();
  assert.equal(quiet.sync.state.last, null, "empty rounds are not shown in !wastatus");
});

test("an API error ends the round without throwing", async () => {
  const sync = createContactSync({
    api: async () => {
      throw new Error("Database belum di-update untuk kontak WhatsApp");
    },
    getSocket: () => ({}),
    isReady: () => true,
  });
  const summary = await sync.run();
  assert.match(summary.error, /Database belum di-update/);
  assert.equal(sync.state.running, false);
});
