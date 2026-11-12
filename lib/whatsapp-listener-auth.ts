import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { normalizeBotPhone } from "@/lib/discord-bot-data";
import { canonicalRequestTarget } from "@/lib/discord-bot-signature";

// Requests from the WhatsApp listener (whatsapp-listener/ on the VPS). It has
// its own secret (WHATSAPP_LISTENER_SECRET), so the Discord bot secret cannot
// call these routes and the other way round. Must stay identical to
// signListenerRequest() in whatsapp-listener/api-client.mjs.

export const WHATSAPP_MIGRATION_MESSAGE =
  "Database belum di-update untuk WhatsApp listener. Jalankan migration 20261111090000_add_whatsapp_listener.sql di Supabase.";

// 62 + 6-15 digits, or null.
export function whatsappPhoneFrom(value: unknown) {
  const phone = normalizeBotPhone(value);
  return /^62\d{6,15}$/.test(phone) ? phone : null;
}

const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;
const MAX_JSON_BODY_BYTES = 32 * 1024;

export function buildListenerSignaturePayload(parts: {
  timestamp: string;
  method: string;
  url: URL;
  body: string;
}) {
  return [parts.timestamp, parts.method.toUpperCase(), canonicalRequestTarget(parts.url), parts.body].join("\n");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function readWhatsappListenerJson(req: NextRequest) {
  const secret = process.env.WHATSAPP_LISTENER_SECRET;
  if (!secret || secret.length < 32) {
    return {
      response: errorResponse("WhatsApp listener belum dikonfigurasi di server (WHATSAPP_LISTENER_SECRET di env Vercel)", 503),
      body: null,
    };
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
    return { response: errorResponse("Payload terlalu besar", 413), body: null };
  }
  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_JSON_BODY_BYTES) {
    return { response: errorResponse("Payload terlalu besar", 413), body: null };
  }

  const timestamp = String(req.headers.get("x-meta-wa-timestamp") || "").trim();
  const signature = String(req.headers.get("x-meta-wa-signature") || "").trim();
  const timestampMs = Number(timestamp);
  const unauthorized = { response: errorResponse("Request listener tidak valid (unauthorized)", 401), body: null };
  if (
    !timestamp ||
    !signature ||
    !Number.isFinite(timestampMs) ||
    Math.abs(Date.now() - timestampMs) > SIGNATURE_TOLERANCE_MS
  ) {
    return unauthorized;
  }

  const expected = createHmac("sha256", secret)
    .update(buildListenerSignaturePayload({ timestamp, method: req.method, url: new URL(req.url), body: rawBody }))
    .digest("hex");
  if (!safeEqual(signature, expected)) return unauthorized;

  if (!rawBody) return { response: null, body: {} as Record<string, unknown> };
  try {
    const body = JSON.parse(rawBody);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { response: errorResponse("Payload harus JSON object", 400), body: null };
    }
    return { response: null, body: body as Record<string, unknown> };
  } catch {
    return { response: errorResponse("Payload bukan JSON yang valid", 400), body: null };
  }
}
