import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { SignJWT } from "jose";
import * as core from "../lib/visitor-ip-core.ts";
import * as location from "../lib/visitor-location.ts";
process.env.ADMIN_JWT_SECRET = "visitor-location-test-only-signing-key";
process.env.NODE_ENV = "production";
const sessions = await import("../lib/visitor-location-session.ts");
const origin = "https://metawellness.id";
const ua = "Mozilla/5.0 Chrome/130.0.0.0";
const deviceKey = core.visitorDevice(new Headers({ "user-agent": ua })).key;
const session = await sessions.createLocationSession(origin, deviceKey);
const fix = () => ({ mode: "update", session_id: session.id, latitude: -6.2, longitude: 106.8, accuracy_m: 12, observed_at: new Date().toISOString() });
function fixture({ dbError = null, status = "saved" } = {}) {
  const calls = [], cookies = [], background = [];
  const db = { rpc(name, args) {
    calls.push({ name, args });
    return { abortSignal: async () => ({ data: { status: name === "visitor_location_start" && status === "saved" ? "started" : status, created: false }, error: dbError }) };
  } };
  const modules = {
    "next/server": { after: (task) => background.push(task) },
    "@/lib/api-response": {
      errorResponse: (message, status = 400) => ({ message, status }),
      successResponse: (data) => ({ data, status: 200, headers: new Headers(), cookies: { set: (...args) => cookies.push(args) } }),
    },
    "@/lib/supabase-server": { supabaseAdmin: db },
    "@/lib/visitor-ip-core": core,
    "@/lib/visitor-ip-logs": { enrichVisitorIp: async () => { throw Error("Unexpected lookup"); } },
    "@/lib/visitor-location": location,
    "@/lib/visitor-location-session": sessions,
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("app/api/visitor-location/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Buffer, URL, Headers, AbortSignal, process: { env: { NODE_ENV: "production", VERCEL: "1" } },
    require: (name) => { assert.ok(name in modules, name); return modules[name]; },
  });
  const req = (body, { token = session.token, headers = {} } = {}) => {
    const request = new Request(`${origin}/api/visitor-location`, { method: "POST", headers: {
      origin, "content-type": "application/json", "x-vercel-forwarded-for": "8.8.8.8", "user-agent": ua, ...headers,
    }, body: JSON.stringify(body) });
    request.cookies = { get: () => token ? { value: token } : undefined };
    return request;
  };
  return { post: exports.POST, req, calls, cookies, background };
}

test("sharing sessions are bound to browser, origin, purpose and expiration", async () => {
  assert.equal(await sessions.verifyLocationSession(session.token, session.id, origin, deviceKey), true);
  assert.equal(await sessions.verifyLocationSession(session.token, session.id, "https://meta-peptides.com", deviceKey), false);
  assert.equal(await sessions.verifyLocationSession(session.token, session.id, origin, "another-browser"), false);
  assert.equal(await sessions.verifyLocationSession(session.token, "another-session", origin, deviceKey), false);
  const expired = await new SignJWT({ device: deviceKey }).setProtectedHeader({ alg: "HS256" }).setIssuer("visitor-location").setAudience(origin).setSubject(session.id).setExpirationTime(1).sign(new TextEncoder().encode(process.env.ADMIN_JWT_SECRET));
  assert.equal(await sessions.verifyLocationSession(expired, session.id, origin, deviceKey), false);
  const admin = await new SignJWT({ role: "root" }).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode(process.env.ADMIN_JWT_SECRET));
  assert.equal(await sessions.verifyLocationSession(admin, session.id, origin, deviceKey), false);
});
test("location freshness expires without new device readings and displays meter/kilometer accuracy", () => {
  const now = Date.now();
  const current = { sharing: true, ended_at: null, observed_at: new Date(now-1000).toISOString(), received_at: new Date(now).toISOString() };
  assert.equal(location.locationIsFresh(current, now), true);
  assert.equal(location.locationIsFresh(current, now+46_000), false);
  assert.equal(location.locationIsFresh({ ...current, sharing: false }, now), false);
  assert.equal(location.locationIsFresh({ ...current, ended_at: new Date(now).toISOString() }, now), false);
  assert.equal(location.locationIsFresh({ ...current, observed_at: new Date(now-60_000).toISOString() }, now), false);
  assert.equal(location.locationAccuracy(12.1), "±13 m");
  assert.equal(location.locationAccuracy(1500), "±1,5 km");
});
test("starting requires explicit consent and returns a scoped HttpOnly cookie without coordinates", async () => {
  const f = fixture();
  assert.equal((await f.post(f.req({ mode: "start", consent: false }))).status, 400);
  assert.equal(f.calls.length, 0);
  const response = await f.post(f.req({ mode: "start", consent: true }));
  assert.equal(response.status, 200);
  assert.ok(response.data.session_id);
  assert.equal(Object.keys(response.data).length, 1);
  assert.equal(f.calls[0].name, "visitor_location_start");
  const options = f.cookies[0][2];
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "strict");
  assert.equal(options.path, "/api/visitor-location");
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("cross-origin, bots, untrusted IPs, invalid coordinates and unknown fields never write", async () => {
  for (const [body, options, expected] of [
    [fix(), { headers: { origin: "https://evil.example" } }, 403],
    [fix(), { headers: { origin: "" } }, 403],
    [fix(), { headers: { "user-agent": "facebookexternalhit/1.1" } }, 400],
    [fix(), { headers: { "x-vercel-forwarded-for": "127.0.0.1" } }, 400],
    [{ ...fix(), latitude: 91 }, {}, 400],
    [{ ...fix(), accuracy_m: -1 }, {}, 400],
    [{ ...fix(), ip_id: "forged" }, {}, 400],
    [{ ...fix(), observed_at: new Date(Date.now()-180_000).toISOString() }, {}, 400],
    [{ ...fix(), observed_at: new Date(Date.now()+60_000).toISOString() }, {}, 400],
    [{ mode: "start", consent: true, unexpected: "a".repeat(2048) }, {}, 413],
  ]) {
    const f = fixture();
    assert.equal((await f.post(f.req(body, options))).status, expected);
    assert.equal(f.calls.length, 0);
  }
});
test("updates require the valid session cookie and always use the server-derived IP and browser", async () => {
  for (const token of [null, "forged"]) {
    const f = fixture();
    assert.equal((await f.post(f.req(fix(), { token }))).status, 401);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture();
  const result = await f.post(f.req(fix()));
  assert.equal(result.status, 200);
  assert.equal(f.calls[0].name, "visitor_location_record");
  assert.equal(f.calls[0].args.p_ip, "8.8.8.8");
  assert.equal(f.calls[0].args.p_device_key, deviceKey);
  assert.equal(f.calls[0].args.p_accuracy_m, 12);
  assert.equal(Object.keys(result.data).join(","), "status");
});
test("pause and stop affect only the signed session; stop also clears its cookie", async () => {
  for (const mode of ["pause", "stop"]) {
    const f = fixture();
    const result = await f.post(f.req({ mode, session_id: session.id }));
    assert.equal(result.status, 200);
    assert.equal(f.calls[0].name, "visitor_location_end");
    assert.equal(f.calls[0].args.p_session_id, session.id);
    assert.equal(f.calls[0].args.p_stop, mode === "stop");
    assert.equal(f.cookies.length, mode === "stop" ? 1 : 0);
    if (mode === "stop") assert.equal(f.cookies[0][2].maxAge, 0);
  }
});
test("missing migration, rate limits and stopped sessions produce explicit errors", async () => {
  const unavailable = fixture({ dbError: { code: "PGRST202" } });
  assert.equal((await unavailable.post(unavailable.req({ mode: "start", consent: true }))).status, 503);
  const limited = fixture({ status: "limited" });
  assert.equal((await limited.post(limited.req({ mode: "start", consent: true }))).status, 429);
  const ended = fixture({ status: "ended" });
  assert.equal((await ended.post(ended.req(fix()))).status, 401);
});
