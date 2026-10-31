import { createHmac } from "node:crypto";

export class BotApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = "BotApiError";
    this.status = status;
    this.details = details;
  }
}

function getConfig() {
  const baseUrl = String(process.env.METAWELLNESS_API_BASE_URL || "").replace(/\/+$/, "");
  const secret = String(process.env.DISCORD_BOT_API_SECRET || "");
  if (!baseUrl || !secret) {
    throw new Error("METAWELLNESS_API_BASE_URL dan DISCORD_BOT_API_SECRET wajib diisi.");
  }
  return { baseUrl, secret };
}

// Must stay identical to canonicalRequestTarget() in lib/discord-bot-auth.ts.
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

export function signRequest({ secret, timestamp, method, url, context, body }) {
  const canonical = [
    timestamp,
    method.toUpperCase(),
    canonicalTarget(url),
    context.guildId,
    context.channelId,
    context.userId,
    context.username,
    context.messageId,
    context.command,
    body,
  ].join("\n");
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

function getRequestContext(message, command) {
  return {
    guildId: String(message.guildId || ""),
    channelId: String(message.channelId || ""),
    userId: String(message.author?.id || ""),
    username: encodeURIComponent(String(message.author?.username || "unknown")),
    messageId: String(message.id || ""),
    command: String(command || "").replace(/^!/, "").toLowerCase(),
  };
}

// path may include a query string; pass query values through `query` so they
// are encoded consistently.
async function signedFetch(path, { method = "GET", json, query, message, command, timeoutMs = 45_000 }) {
  const { baseUrl, secret } = getConfig();
  const url = new URL(path.replace(/^\//, ""), `${baseUrl}/`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const body = json === undefined ? "" : JSON.stringify(json);
  const timestamp = Date.now().toString();
  const context = getRequestContext(message, command);
  const signature = signRequest({ secret, timestamp, method, url, context, body });

  try {
    return await fetch(url, {
      method,
      body: body || undefined,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        "x-meta-bot-timestamp": timestamp,
        "x-meta-bot-signature": signature,
        "x-discord-guild-id": context.guildId,
        "x-discord-channel-id": context.channelId,
        "x-discord-user-id": context.userId,
        "x-discord-username": context.username,
        "x-discord-message-id": context.messageId,
        "x-discord-command": context.command,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const reason = error?.name === "TimeoutError" ? "timeout" : error?.message || "network error";
    throw new BotApiError(`Server Meta Wellness tidak bisa dihubungi (${reason}). Coba lagi sebentar.`, 0);
  }
}

// A response without our JSON body means the request never reached the bot
// API: wrong base URL, or the website does not have the /api/bot code yet.
function notBotApiMessage(response) {
  const { baseUrl } = getConfig();
  if (response.status === 404) {
    return `API bot tidak ditemukan di ${baseUrl} (HTTP 404). Kode /api/bot belum ter-deploy di website itu, atau METAWELLNESS_API_BASE_URL di discord-bot/.env salah.`;
  }
  return `Server ${baseUrl} membalas HTTP ${response.status}, bukan respons API bot. Coba lagi sebentar; kalau terus terjadi, cek deploy website.`;
}

export async function requestJson(path, options) {
  const response = await signedFetch(path, options);
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload.success !== "boolean") {
    throw new BotApiError(notBotApiMessage(response), response.status);
  }
  if (!response.ok || !payload.success) {
    throw new BotApiError(
      payload.message || `Server error ${response.status}`,
      response.status,
      payload.error || null,
    );
  }
  return payload.data;
}

export async function requestFile(path, options) {
  const response = await signedFetch(path, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new BotApiError(
      payload?.message || notBotApiMessage(response),
      response.status,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}
