import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { canonicalTarget as botCanonicalTarget } from "../discord-bot/api-client.mjs";
import { ListenerApiError, canonicalTarget, getListenerConfig, postListener, postListenerWithRetry, signListenerRequest } from "./api-client.mjs";

const config = { baseUrl: "https://example.test", secret: "s".repeat(40) };

test("canonical target is the same as the Discord bot's (and the API's)", () => {
  for (const raw of ["https://x.test/api/bot/whatsapp/inbound", "https://x.test/api/a%20b?z=1&a=2&a=1", "https://x.test/p?q=a+b"]) {
    const url = new URL(raw);
    assert.equal(canonicalTarget(url), botCanonicalTarget(url));
  }
});

test("signature = HMAC of timestamp, method, target, body", () => {
  const url = new URL("https://x.test/api/bot/whatsapp/inbound");
  const expected = createHmac("sha256", "k").update(["1700000000000", "POST", "/api/bot/whatsapp/inbound", '{"a":1}'].join("\n")).digest("hex");
  assert.equal(signListenerRequest({ secret: "k", timestamp: "1700000000000", method: "post", url, body: '{"a":1}' }), expected);
});

test("config needs the base URL and a long secret", () => {
  assert.throws(() => getListenerConfig({ METAWELLNESS_API_BASE_URL: "https://x", WHATSAPP_LISTENER_SECRET: "short" }));
  assert.deepEqual(getListenerConfig({ METAWELLNESS_API_BASE_URL: "https://x/", WHATSAPP_LISTENER_SECRET: "s".repeat(32) }), { baseUrl: "https://x", secret: "s".repeat(32) });
});

test("postListener sends signed JSON and returns data", async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url: String(url), init };
    return new Response(JSON.stringify({ success: true, data: { action: "stored" } }), { status: 200 });
  };
  const data = await postListener("/api/bot/whatsapp/inbound", { a: 1 }, { config, fetchImpl });
  assert.deepEqual(data, { action: "stored" });
  assert.equal(seen.url, "https://example.test/api/bot/whatsapp/inbound");
  const { "x-meta-wa-timestamp": timestamp, "x-meta-wa-signature": signature } = seen.init.headers;
  assert.equal(signature, signListenerRequest({ secret: config.secret, timestamp, method: "POST", url: new URL(seen.url), body: seen.init.body }));
});

test("retries network errors and 5xx, not 4xx", async () => {
  let calls = 0;
  const flaky = async () => {
    calls += 1;
    if (calls < 3) return new Response(JSON.stringify({ success: false, message: "down" }), { status: 502 });
    return new Response(JSON.stringify({ success: true, data: { ok: 1 } }), { status: 200 });
  };
  assert.deepEqual(await postListenerWithRetry("/x", {}, { config, fetchImpl: flaky, delays: [1, 1, 1] }), { ok: 1 });
  assert.equal(calls, 3);

  calls = 0;
  const bad = async () => {
    calls += 1;
    return new Response(JSON.stringify({ success: false, message: "Nomor WhatsApp tidak valid" }), { status: 400 });
  };
  await assert.rejects(postListenerWithRetry("/x", {}, { config, fetchImpl: bad, delays: [1] }), (error) => error instanceof ListenerApiError && error.status === 400);
  assert.equal(calls, 1);

  calls = 0;
  const offline = async () => {
    calls += 1;
    throw new TypeError("fetch failed");
  };
  await assert.rejects(postListenerWithRetry("/x", {}, { config, fetchImpl: offline, attempts: 2, delays: [1] }), (error) => error.status === 0);
  assert.equal(calls, 2);
});
