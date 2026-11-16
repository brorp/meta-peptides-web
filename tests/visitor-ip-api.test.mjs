import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import * as core from "../lib/visitor-ip-core.ts";
const id = "00000000-0000-4000-8000-000000000001";
function load(path, modules, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    URL,
    Headers,
    Buffer,
    AbortSignal,
    console,
    process: {
      env: {
        NODE_ENV: "production",
        VERCEL: "1",
        ADMIN_JWT_SECRET: "test-only-not-a-production-secret",
      },
    },
    ...globals,
    require(name) {
      if (!(name in modules)) throw Error(`Unexpected dependency: ${name}`);
      return modules[name];
    },
  });
  return exports;
}
const responses = {
  errorResponse: (message, status = 400) => ({ message, status }),
  successResponse: (data, message, status = 200) => ({ data, message, status }),
};
class VisitorLogError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}
const request = (path = "/api/admin/visitor-logs", origin) => ({
  url: `https://meta-peptides.com${path}`,
  headers: new Headers(origin ? { origin } : {}),
});
function rootRoute(path, role) {
  const calls = [];
  const handlers = load(path, {
    "next/server": {},
    zod: { z },
    "@/lib/api-response": responses,
    "@/lib/admin-api": {
      requireAdminApiSession: async (allowed) => ({
        role,
        response: !role
          ? { status: 401 }
          : !allowed.includes(role)
            ? { status: 403 }
            : null,
      }),
    },
    "@/lib/visitor-ip-logs": {
      VisitorLogError,
      listVisitorIps: async () => {
        calls.push("list");
        return [];
      },
      getVisitorIp: async () => {
        calls.push("detail");
        return {};
      },
      enrichVisitorIp: async () => {
        calls.push("lookup");
        return { status: "ready" };
      },
    },
  });
  return { handlers, calls };
}

test("staff and unauthenticated sessions cannot list IPs, read linked contacts or trigger lookups", async () => {
  for (const role of [null, "admin"])
    for (const file of [
      "../app/api/admin/visitor-logs/route.ts",
      "../app/api/admin/visitor-logs/[id]/route.ts",
    ]) {
      const { handlers, calls } = rootRoute(file, role);
      const context = { params: Promise.resolve({ id }) };
      assert.equal(
        (await handlers.GET(request(), context)).status,
        role ? 403 : 401,
      );
      if (handlers.POST)
        assert.equal(
          (await handlers.POST(request(), context)).status,
          role ? 403 : 401,
        );
      assert.deepEqual(calls, []);
    }
});
test("root detail rejects malformed identifiers and cross-origin lookup mutations", async () => {
  const { handlers, calls } = rootRoute(
    "../app/api/admin/visitor-logs/[id]/route.ts",
    "root",
  );
  assert.equal(
    (await handlers.GET(request(), { params: Promise.resolve({ id: "bad" }) }))
      .status,
    400,
  );
  assert.equal(
    (
      await handlers.POST(request(undefined, "https://evil.example"), {
        params: Promise.resolve({ id }),
      })
    ).status,
    403,
  );
  assert.deepEqual(calls, []);
  assert.equal(
    (await handlers.GET(request(), { params: Promise.resolve({ id }) })).status,
    200,
  );
});
test("guest authentication records the server-issued user and never sends an email", async () => {
  const tasks = [],
    seen = [];
  let authOptions;
  const handlers = load("../app/api/auth/guest/route.ts", {
    "next/server": { after: (task) => tasks.push(task) },
    "@/lib/api-response": responses,
    "@/lib/supabase-server": {
      createClientCookies: async () => ({
        auth: {
          signInAnonymously: async (options) => {
            authOptions = options;
            return {
              data: {
                user: { id, is_anonymous: true, created_at: "2026-11-16" },
              },
              error: null,
            };
          },
        },
      }),
    },
    "@/lib/auth-notifications": {
      buildVisitorMetadata: () => ({ entryPath: "/shop" }),
      getProviderLabel: () => "Guest / Anonymous",
    },
    "@/lib/visitor-ip-logs": {
      recordVisitorRequest: async (req, identity) => seen.push(identity),
    },
  });
  const result = await handlers.POST({
    ...request("/api/auth/guest"),
    json: async () => ({ user_id: "forged", ip_address: "1.1.1.1" }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.user.id, id);
  assert.equal(tasks.length, 1);
  await tasks[0]();
  assert.equal(seen[0].user.id, id);
  assert.equal(seen[0].source, "guest");
  assert.equal(authOptions.options.data.guest_entry_path, "/shop");
});
function recorder({ created = false, lookupThrows = false } = {}) {
  const calls = [];
  const db = {
    rpc(name, args) {
      calls.push({ name, args });
      return {
        abortSignal() {
          return this;
        },
        then(resolve) {
          return Promise.resolve(
            name === "visitor_log_record"
              ? { data: { id, created }, error: null }
              : { data: "8.8.8.8", error: null },
          ).then(resolve);
        },
      };
    },
    from(table) {
      return {
        select() {
          return this;
        },
        update(value) {
          calls.push({ update: value });
          return this;
        },
        eq() {
          return this;
        },
        abortSignal() {
          return this;
        },
        async single() {
          return { data: { geo: { country_code: "ID" } }, error: null };
        },
        then(resolve) {
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
    },
  };
  const handlers = load(
    "../lib/visitor-ip-logs.ts",
    {
      "@/lib/supabase-server": { supabaseAdmin: db },
      "@/lib/visitor-ip-core": core,
    },
    {
      fetch: async (url) => {
        calls.push({ url });
        if (lookupThrows) throw Error("provider down");
        return new Response(
          JSON.stringify({
            ip: "8.8.8.8",
            isp: { isp: "Example ISP" },
            location: {
              country_code: "ID",
              city: "Jakarta",
              latitude: -6.2,
              longitude: 106.8,
            },
          }),
        );
      },
    },
  );
  return { handlers, calls };
}
const pageRequest = () =>
  new Request("https://metawellness.id/shop?secret=omit", {
    headers: {
      "x-vercel-forwarded-for": "8.8.8.8",
      "x-forwarded-for": "1.1.1.1",
      "user-agent": "Chrome/130.0",
    },
  });
test("existing IP/device observation makes no external lookup and uses only the trusted address", async () => {
  const { handlers, calls } = recorder();
  await handlers.recordVisitorRequest(pageRequest());
  assert.equal(calls.length, 1);
  assert.equal(calls[0].args.p_ip, "8.8.8.8");
  assert.equal(calls[0].args.p_path, "/shop");
  assert.equal(calls[0].args.p_hostname, "metawellness.id");
  assert.equal(calls[0].args.p_user_id, null);
});
test("a new IP is enriched once and provider failure still preserves capture", async () => {
  for (const fail of [false, true]) {
    const { handlers, calls } = recorder({ created: true, lookupThrows: fail });
    await handlers.recordVisitorRequest(pageRequest());
    assert.equal(calls.filter((c) => c.url).length, 1);
    assert.equal(calls[0].name, "visitor_log_record");
    const update = calls.find((c) => c.update).update;
    assert.equal(update.geo_status, fail ? "unavailable" : "ready");
    if (!fail) {
      assert.equal(update.geo.isp, "Example ISP");
      assert.equal(update.geo.country_code, "ID");
    }
  }
});

test("bot requests never write IPs/devices/identities or call enrichment, including auth hooks", async () => {
  const { handlers, calls } = recorder({ created: true });
  for (const ua of ["facebookexternalhit/1.1", "Googlebot/2.1", "curl/8.7.1"]) {
    const req = pageRequest();
    req.headers.set("user-agent", ua);
    await handlers.recordVisitorRequest(req);
    await handlers.recordVisitorRequest(req, {
      user: { id, is_anonymous: true }, source: "guest",
    });
  }
  assert.deepEqual(calls, []);
});

test("proxy captures storefront pages in background without adding an auth roundtrip; staff remains blocked", async () => {
  const capture = [],
    background = [];
  let authCalls = 0;
  const make = (role) =>
    load(
      "../proxy.ts",
      {
        "@supabase/ssr": {
          createServerClient: () => ({
            auth: {
              getUser: async () => {
                authCalls++;
                return { data: { user: null } };
              },
            },
          }),
        },
        jose: { jwtVerify: async () => ({ payload: { role } }) },
        "next/server": {
          NextResponse: {
            next: () => ({ kind: "next" }),
            redirect: (url) => ({ kind: "redirect", url: String(url) }),
            json: (data, options) => ({ ...options, data }),
          },
        },
        "@/lib/visitor-ip-core": core,
        "@/lib/visitor-ip-logs": {
          recordVisitorRequest: async (req) => capture.push(req.url),
        },
      },
      { TextEncoder },
    );
  const req = (path) => {
    const r = new Request(`https://meta-peptides.com${path}`);
    r.nextUrl = new URL(r.url);
    r.cookies = { get: () => ({ value: "session" }), getAll: () => [] };
    return r;
  };
  const event = { waitUntil: (promise) => background.push(promise) };
  assert.equal((await make(null).proxy(req("/shop"), event)).kind, "next");
  await Promise.all(background);
  assert.equal(capture.length, 1);
  assert.equal(authCalls, 0);
  assert.equal(
    (await make("admin").proxy(req("/api/admin/visitor-logs"), event)).status,
    403,
  );
  assert.equal(
    (await make("admin").proxy(req("/panel-xyz123/visitor-logs"), event)).url,
    "https://meta-peptides.com/panel-xyz123/orders",
  );
});

test("historical bot-only IPs disappear before pagination; mixed IPs retain only browser devices", async () => {
  const bot = { user_agent: "facebookexternalhit/1.1", is_bot: false };
  const browser = { user_agent: "Mozilla/5.0 Chrome/130.0", is_bot: false };
  const ips = [
    { id: "bot-only", devices: [{ metadata: bot }] },
    { id: "flagged-bot", devices: [{ metadata: { ...browser, is_bot: true } }] },
    { id, devices: [{ metadata: bot }, { metadata: browser }] },
    ...Array.from({ length: 30 }, (_, i) => ({
      id: `browser-${i}`, devices: [{ metadata: browser }],
    })),
  ];
  const db = {
    from(table) {
      let fields = "", ipId, start = 0, end = Infinity;
      const filters = [];
      const matching = (devices, relation = "") => devices.filter((row) =>
        filters.filter((f) => f.relation === relation).every((f) => f.test(row.metadata)),
      );
      return {
        select(value) {
          fields = value;
          return this;
        },
        not(column, op, value) {
          assert.equal(op, "imatch");
          const parts = column.split(".");
          filters.push({ relation: parts.length > 1 ? parts[0] : "",
            test: (metadata) => !new RegExp(value, "i").test(metadata.user_agent) });
          return this;
        },
        or(_expression, options) {
          filters.push({ relation: options?.referencedTable || "",
            test: (metadata) => metadata.is_bot !== true });
          return this;
        },
        order() { return this; },
        limit() { return this; },
        range(a, b) {
          start = a; end = b;
          return this;
        },
        eq(_column, value) {
          ipId = value;
          return this;
        },
        async maybeSingle() {
          return { data: ips.find((row) => row.id === ipId), error: null };
        },
        then(resolve) {
          let data = [];
          if (table === "visitor_ip_logs") {
            data = ips.map((row) => ({
              id: row.id,
              visitor_ip_devices: [{ count: matching(row.devices, "visitor_ip_devices").length }],
              browser_agents: matching(row.devices, "browser_agents"),
            })).filter((row) => !fields.includes("!inner") || row.browser_agents.length);
          } else if (table === "visitor_ip_devices") {
            data = matching(ips.find((row) => row.id === ipId)?.devices || []);
          }
          return Promise.resolve({
            data: data.slice(start, end + 1), count: data.length,
            error: null,
          }).then(resolve);
        },
      };
    },
  };
  const handlers = load("../lib/visitor-ip-logs.ts", {
    "@/lib/supabase-server": { supabaseAdmin: db },
    "@/lib/visitor-ip-core": core,
  });
  const list = await handlers.listVisitorIps(new URLSearchParams());
  assert.equal(list.pagination.total, 31);
  assert.equal(list.pagination.total_pages, 2);
  assert.equal(list.items.length, 30);
  assert.equal(list.items[0].id, id);
  assert.equal(list.items[0].visitor_ip_devices[0].count, 1);
  assert.equal("browser_agents" in list.items[0], false);
  const last = await handlers.listVisitorIps(new URLSearchParams({ page: "2" }));
  assert.equal(last.items.length, 1);
  assert.equal(last.pagination.total, 31);
  const detail = await handlers.getVisitorIp(id);
  assert.equal(detail.device_count, 1);
  assert.equal(detail.devices[0].metadata.user_agent, browser.user_agent);
  await assert.rejects(handlers.getVisitorIp("bot-only"), { status: 404 });
  await assert.rejects(handlers.getVisitorIp("flagged-bot"), { status: 404 });
  assert.equal(bot.is_bot, false, "historical evidence stays unchanged");
});
