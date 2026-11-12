import { createHmac } from "node:crypto";

// Signed calls to /api/bot/whatsapp/*. The signature must stay identical to
// buildListenerSignaturePayload() in lib/whatsapp-listener-auth.ts.

export class ListenerApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ListenerApiError";
    this.status = status;
  }
}

// Same as canonicalRequestTarget() in lib/discord-bot-signature.ts.
export function canonicalTarget(url) {
  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Keep the raw path when it is not valid percent-encoding.
  }
  const query = Array.from(url.searchParams.entries())
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
        : leftKey < rightKey ? -1 : 1,
    )
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return query ? `${pathname}?${query}` : pathname;
}

export function signListenerRequest({ secret, timestamp, method, url, body }) {
  const canonical = [timestamp, method.toUpperCase(), canonicalTarget(url), body].join("\n");
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

export function getListenerConfig(env = process.env) {
  const baseUrl = String(env.METAWELLNESS_API_BASE_URL || "").replace(/\/+$/, "");
  const secret = String(env.WHATSAPP_LISTENER_SECRET || "");
  if (!baseUrl || secret.length < 32) {
    throw new Error("METAWELLNESS_API_BASE_URL dan WHATSAPP_LISTENER_SECRET (minimal 32 karakter) wajib diisi di whatsapp-listener/.env.");
  }
  return { baseUrl, secret };
}

export async function postListener(path, json, { config = getListenerConfig(), timeoutMs = 30_000, fetchImpl = fetch } = {}) {
  const url = new URL(`${config.baseUrl}${path}`);
  const body = JSON.stringify(json ?? {});
  const timestamp = String(Date.now());
  const signature = signListenerRequest({ secret: config.secret, timestamp, method: "POST", url, body });
  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-meta-wa-timestamp": timestamp,
        "x-meta-wa-signature": signature,
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ListenerApiError(`API tidak bisa dihubungi (${error?.name === "TimeoutError" ? "timeout" : error?.message || "network error"})`, 0);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new ListenerApiError(payload?.message || `HTTP ${response.status}`, response.status);
  }
  return payload.data;
}

// Network errors, 5xx and 429 are retried; a 4xx means the payload itself is
// wrong and retrying will not help.
export async function postListenerWithRetry(path, json, { attempts = 4, delays = [2_000, 10_000, 30_000], ...options } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await postListener(path, json, options);
    } catch (error) {
      const retryable = error.status === 0 || error.status === 429 || error.status >= 500;
      if (!retryable || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[Math.min(attempt - 1, delays.length - 1)]));
    }
  }
}
