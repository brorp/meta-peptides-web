import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import * as core from "../lib/cs-kpi-core.ts";

const adminId = "00000000-0000-4000-8000-000000000001";
const state = {
  config: {
    ...core.DEFAULT_KPI_CONFIG,
    enabled: true,
    default_admin_id: adminId,
  },
  admins: [
    {
      id: adminId,
      name: "CS Utama",
      active: true,
      created_at: "2026-11-01T00:00:00Z",
    },
  ],
};
class KpiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}
function loadRoute(path, role, options = {}) {
  const calls = [];
  const supabaseAdmin = {
    from(table) {
      calls.push({ table });
      const query = {
        select() {
          return this;
        },
        eq(key, value) {
          calls.push({ filter: key, value });
          return this;
        },
        insert(value) {
          calls.push({ insert: value });
          return this;
        },
        async maybeSingle() {
          return { data: options.report || null, error: null };
        },
        async single() {
          return {
            data: { id: "saved" },
            error: options.duplicate ? { code: "23505" } : null,
          };
        },
      };
      return query;
    },
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      return {
        data: "ok",
        error: options.conflict ? { message: "CS_KPI_CONFLICT" } : null,
      };
    },
  };
  const modules = {
    "node:crypto": { randomUUID },
    "next/server": {},
    zod: { z },
    "@/lib/admin-api": {
      requireAdminApiSession: async (allowed = ["root", "admin"]) => ({
        role,
        response: !role
          ? { status: 401 }
          : !allowed.includes(role)
            ? { status: 403 }
            : null,
      }),
    },
    "@/lib/api-response": {
      errorResponse: (message, status = 400) => ({ message, status }),
      successResponse: (data, message, status = 200) => ({
        data,
        message,
        status,
      }),
    },
    "@/lib/cs-kpi-core": core,
    "@/lib/cs-kpi": {
      KpiError,
      loadKpiState: async () => {
        calls.push({ load: true });
        return state;
      },
      loadKpiDashboard: async () => {
        calls.push({ dashboard: true });
        return { secret: true };
      },
      runKpiScan: async () => {
        calls.push({ scan: true });
        return { status: "completed", recorded: 5 };
      },
      kpiRows: async () => [],
    },
    "@/lib/supabase-server": { supabaseAdmin },
    "@/lib/whatsapp-listener-auth": {
      readWhatsappListenerJson: async () =>
        options.signed
          ? { response: null, body: { connected: true } }
          : { response: { status: 401 } },
    },
  };
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
    Buffer,
    URL,
    Date,
    SyntaxError,
    console,
    require(name) {
      if (!(name in modules)) throw Error(`Unexpected module ${name}`);
      return modules[name];
    },
  });
  return { handlers: exports, calls };
}
const request = (body = {}, origin) => ({
  url: "https://example.com/api/admin/cs-supervision",
  headers: new Headers(origin ? { origin } : {}),
  text: async () => JSON.stringify(body),
});

test("staff and unauthenticated sessions cannot read or mutate supervision, including proof endpoints", async () => {
  for (const role of [null, "admin"])
    for (const file of [
      "../app/api/admin/cs-supervision/route.ts",
      "../app/api/admin/cs-supervision/[id]/route.ts",
    ]) {
      const { handlers, calls } = loadRoute(file, role);
      assert.equal(
        (
          await handlers.GET(request(), {
            params: Promise.resolve({ id: adminId }),
          })
        ).status,
        role ? 403 : 401,
      );
      if (handlers.POST)
        assert.equal(
          (await handlers.POST(request({ action: "scan" }))).status,
          role ? 403 : 401,
        );
      assert.equal(
        calls.length,
        0,
        "authorization must precede every database read or scan",
      );
    }
});

test("root review uses optimistic version and requires a real reviewer and reason", async () => {
  const { handlers, calls } = loadRoute(
    "../app/api/admin/cs-supervision/route.ts",
    "root",
    { conflict: true },
  );
  const body = {
    action: "review",
    id: adminId,
    status: "confirmed",
    admin_id: adminId,
    note: "Sudah dicek direksi",
    reviewer: "Ryan",
    version: 3,
  };
  assert.equal(
    (await handlers.POST(request({ ...body, reviewer: "" }))).status,
    400,
  );
  assert.equal((await handlers.POST(request(body))).status, 409);
  const rpc = calls.find((call) => call.rpc);
  assert.equal(rpc.args.p_version, 3);
  assert.equal(rpc.args.p_reviewer, "Ryan");
});

test("root mutation rejects foreign origins, oversized payloads and unknown fields", async () => {
  const { handlers, calls } = loadRoute(
    "../app/api/admin/cs-supervision/route.ts",
    "root",
  );
  assert.equal(
    (await handlers.POST(request({ action: "scan" }, "https://evil.example")))
      .status,
    403,
  );
  assert.equal(
    (await handlers.POST(request({ action: "scan", extra: "x".repeat(16001) })))
      .status,
    413,
  );
  assert.equal(
    (await handlers.POST(request({ action: "scan", points: 100 }))).status,
    400,
  );
  assert.equal(calls.length, 0);
});

test("staff daily report is server-attributed and server-timestamped without KPI details", async () => {
  const { handlers, calls } = loadRoute(
    "../app/api/admin/cs-daily-reports/route.ts",
    "admin",
  );
  const report = {
    report_date: core.dateWib(),
    summary: "Memproses order dan follow up pelanggan hari ini",
    follow_up: "Besok follow up",
    blockers: "",
  };
  const before = Date.now();
  assert.equal((await handlers.POST(request(report))).status, 201);
  const inserted = calls.find((call) => call.insert).insert;
  assert.equal(inserted.admin_id, adminId);
  assert.equal(inserted.recorded_by, "admin");
  assert.ok(new Date(inserted.sent_at).getTime() >= before);
  assert.equal(inserted.source, "panel");
  const result = await handlers.GET(request());
  assert.deepEqual(Object.keys(result.data).sort(), [
    "admin_name",
    "deadline",
    "report",
    "today",
  ]);
  assert.ok(
    calls.some((call) => call.filter === "admin_id" && call.value === adminId),
  );
  assert.equal(
    (
      await handlers.POST(
        request({ ...report, admin_id: "someone-else", sent_at: "2020-01-01" }),
      )
    ).status,
    400,
  );
});

test("late reporting cannot forge deadlines and a second submission cannot replace evidence", async () => {
  const { handlers } = loadRoute(
    "../app/api/admin/cs-daily-reports/route.ts",
    "admin",
    { duplicate: true },
  );
  const report = {
    report_date: core.dateWib(),
    summary: "Follow up semua pelanggan dan memproses order",
    follow_up: "",
    blockers: "",
  };
  assert.equal((await handlers.POST(request(report))).status, 409);
  assert.equal(
    (
      await handlers.POST(
        request({ ...report, report_date: core.nextDate(core.dateWib()) }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await handlers.POST(request({ ...report, report_date: "2026-02-30" })))
      .status,
    400,
  );
});

test("worker endpoint requires listener authentication and returns job health only", async () => {
  const denied = loadRoute("../app/api/bot/whatsapp/supervise/route.ts", null);
  assert.equal((await denied.handlers.POST(request())).status, 401);
  assert.equal(denied.calls.length, 0);
  const signed = loadRoute("../app/api/bot/whatsapp/supervise/route.ts", null, {
    signed: true,
  });
  const result = await signed.handlers.POST(request());
  assert.equal(result.status, 200);
  assert.equal(result.data.status, "completed");
  assert.deepEqual(Object.keys(result.data), ["status"]);
  assert.equal(signed.calls[0].rpc, "cs_kpi_heartbeat");
});
