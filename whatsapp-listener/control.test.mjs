import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ControlError, createControlServer, listenControl, normalizePhone } from "./control.mjs";

function call(socketPath, method, route, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath, path: route, method, headers: { "Content-Type": "application/json" } }, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(raw) }));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

test("normalizePhone accepts Indonesian formats only", () => {
  assert.equal(normalizePhone("081234567890"), "6281234567890");
  assert.equal(normalizePhone("+62 812-3456-7890"), "6281234567890");
  assert.equal(normalizePhone("81234567890"), "6281234567890");
  assert.equal(normalizePhone("6281234567890"), "6281234567890");
  assert.equal(normalizePhone("14155550100"), null);
  assert.equal(normalizePhone("0812"), null);
  assert.equal(normalizePhone(undefined), null);
});

test("a socket path that is too long is refused instead of cut", async () => {
  const server = createControlServer({});
  await assert.rejects(listenControl(server, `/${"x".repeat(120)}/c.sock`), /terlalu panjang/);
});

test("control server routes JSON over a private Unix socket", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "wa-"));
  const socketPath = path.join(dir, "c.sock");
  // A socket file left by a crashed run must not block listen().
  writeFileSync(socketPath, "");
  const logs = [];
  const seen = [];
  const server = await listenControl(
    createControlServer(
      {
        "GET /status": async () => ({ state: "open" }),
        "POST /login": async (body) => {
          seen.push(body);
          if (body.phone === "bad") throw new ControlError("Nomor tidak valid");
          if (body.phone === "busy") throw new ControlError("Sudah tersambung", 409);
          if (body.phone === "boom") throw new Error("secret detail");
          return { ok: true };
        },
      },
      { log: (line) => logs.push(line) },
    ),
    socketPath,
  );
  t.after(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  assert.equal(statSync(socketPath).mode & 0o777, 0o600);
  assert.deepEqual(await call(socketPath, "GET", "/status"), { status: 200, json: { state: "open" } });
  assert.deepEqual(await call(socketPath, "POST", "/login", { phone: "62812" }), { status: 200, json: { ok: true } });
  assert.deepEqual(seen.at(-1), { phone: "62812" });
  assert.deepEqual(await call(socketPath, "POST", "/login"), { status: 200, json: { ok: true } });
  assert.deepEqual(seen.at(-1), {});
  assert.deepEqual(await call(socketPath, "POST", "/login", { phone: "bad" }), { status: 400, json: { error: "Nomor tidak valid" } });
  assert.deepEqual(await call(socketPath, "POST", "/login", { phone: "busy" }), { status: 409, json: { error: "Sudah tersambung" } });
  // Unexpected errors stay in the VPS log.
  const boom = await call(socketPath, "POST", "/login", { phone: "boom" });
  assert.equal(boom.status, 500);
  assert.doesNotMatch(boom.json.error, /secret detail/);
  assert.match(logs.join("\n"), /secret detail/);
  assert.equal((await call(socketPath, "POST", "/login", "{not json")).status, 400);
  assert.equal((await call(socketPath, "POST", "/login", "x".repeat(5000))).status, 413);
  assert.equal((await call(socketPath, "GET", "/nope")).status, 404);
  assert.equal((await call(socketPath, "GET", "/login")).status, 404);
});
