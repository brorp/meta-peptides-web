// Local control API for the Discord bot (!wastatus, !walogin, ...). It
// listens on a Unix socket next to this file, never on a network port: only
// processes of the same VPS user can open it (socket mode 600). The Discord
// bot runs as that user and talks to it through ../discord-bot/wa-control.mjs.
import { chmodSync, existsSync, unlinkSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SOCKET_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "control.sock");
const MAX_BODY = 4 * 1024;

export class ControlError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// 08xx, +62 xxx, 62xxx → 62xxx. Null when it is not an Indonesian number.
export function normalizePhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  if (digits.startsWith("8")) digits = `62${digits}`;
  return /^62\d{8,13}$/.test(digits) ? digits : null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      // Too big: keep reading (and dropping) so the 413 answer still arrives.
      if (size > 1024 * 1024) req.destroy();
      else if (size <= MAX_BODY) chunks.push(chunk);
    });
    req.on("end", () => {
      if (size > MAX_BODY) return reject(new ControlError("Request terlalu besar", 413));
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) return resolve({});
      try {
        const json = JSON.parse(raw);
        resolve(json && typeof json === "object" && !Array.isArray(json) ? json : {});
      } catch {
        reject(new ControlError("Body bukan JSON"));
      }
    });
    req.on("error", reject);
  });
}

// routes: { "GET /status": async (body) => json, ... }
export function createControlServer(routes, { log = () => {} } = {}) {
  return http.createServer(async (req, res) => {
    const send = (status, json) => {
      if (res.headersSent) return;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(json));
    };
    const route = `${req.method} ${new URL(req.url || "/", "http://listener").pathname}`;
    const handler = routes[route];
    if (!handler) return send(404, { error: `Tidak ada ${route}` });
    try {
      const body = req.method === "GET" ? {} : await readBody(req);
      send(200, (await handler(body)) ?? { ok: true });
    } catch (error) {
      if (error instanceof ControlError) return send(error.status, { error: error.message });
      log(`control ${route} gagal: ${error?.message || error}`);
      send(500, { error: "Error di WhatsApp listener, cek log VPS" });
    }
  });
}

// Unix socket paths are limited to about 104 bytes (macOS) / 108 (Linux);
// a longer path would be cut silently.
const MAX_SOCKET_PATH = 100;

export function listenControl(server, socketPath = DEFAULT_SOCKET_PATH) {
  if (Buffer.byteLength(socketPath) > MAX_SOCKET_PATH) {
    return Promise.reject(new Error(`path socket terlalu panjang (${socketPath}); set WA_CONTROL_SOCKET ke path yang lebih pendek`));
  }
  // A socket file left by a crashed run blocks listen(): remove it.
  if (existsSync(socketPath)) unlinkSync(socketPath);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => {
      server.off("error", reject);
      try {
        chmodSync(socketPath, 0o600);
        resolve(server);
      } catch (error) {
        server.close();
        reject(error);
      }
    });
  });
}
