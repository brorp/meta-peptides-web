// Talks to the WhatsApp listener running on the same VPS through its local
// Unix socket (whatsapp-listener/control.sock, see whatsapp-listener/control.mjs).
// No network port and no secret: only the VPS user that runs both processes
// can open the socket.
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_WA_SOCKET = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "whatsapp-listener",
  "control.sock",
);

export class WaControlError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

const NOT_RUNNING =
  "WhatsApp listener tidak jalan di VPS ini (atau belum versi terbaru). Cek `sudo systemctl status metawellness-wa-listener` atau `pm2 list`.";
const NO_ACCESS =
  "Bot tidak boleh membuka socket WhatsApp listener: jalankan bot dan listener dengan user VPS yang sama.";

export function createWaControl({ socketPath = process.env.WA_CONTROL_SOCKET || DEFAULT_WA_SOCKET, requestImpl = http.request } = {}) {
  const call = (method, route, json, timeoutMs = 15_000) =>
    new Promise((resolve, reject) => {
      const body = json === undefined ? null : JSON.stringify(json);
      const req = requestImpl(
        {
          socketPath,
          path: route,
          method,
          headers: body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {},
          timeout: timeoutMs,
        },
        (res) => {
          let raw = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (raw += chunk));
          res.on("end", () => {
            let data = null;
            try {
              data = JSON.parse(raw);
            } catch {
              // Not JSON: handled below.
            }
            if (res.statusCode >= 200 && res.statusCode < 300 && data) resolve(data);
            else reject(new WaControlError(data?.error || `WhatsApp listener menjawab ${res.statusCode}`, res.statusCode));
          });
        },
      );
      req.on("timeout", () => req.destroy(new WaControlError("WhatsApp listener tidak menjawab (timeout). Cek log VPS.")));
      req.on("error", (error) => {
        if (error instanceof WaControlError) return reject(error);
        if (error.code === "ENOENT" || error.code === "ECONNREFUSED") return reject(new WaControlError(NOT_RUNNING));
        if (error.code === "EACCES") return reject(new WaControlError(NO_ACCESS));
        reject(new WaControlError(`Gagal menghubungi WhatsApp listener: ${error.message}`));
      });
      if (body) req.write(body);
      req.end();
    });

  return {
    status: () => call("GET", "/status"),
    login: (phone) => call("POST", "/login", phone ? { phone } : {}),
    logout: () => call("POST", "/logout", {}),
    restart: () => call("POST", "/restart", {}, 30_000),
    // Analysis can take minutes: the listener answers when the job is done.
    run: (job) => call("POST", "/run", { job }, 20 * 60_000),
    // Up to 30 contacts, about 3 seconds each.
    contacts: (wa) => call("POST", "/contacts/sync", wa ? { wa } : {}, 5 * 60_000),
  };
}
