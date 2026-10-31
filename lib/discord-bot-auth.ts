import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-response";
import {
  buildSignaturePayload,
  canonicalRequestTarget,
} from "@/lib/discord-bot-signature";
import { supabaseAdmin } from "@/lib/supabase-server";

const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;
const MAX_JSON_BODY_BYTES = 64 * 1024;

export type DiscordBotRequestContext = {
  guildId: string;
  channelId: string;
  userId: string;
  username: string;
  messageId: string;
  command: string;
};

type AuthOptions = {
  directorsOnly?: boolean;
  maxRequestsPerMinute?: number;
};

const parseIdList = (value: string | undefined) =>
  new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

function getHeader(req: NextRequest, name: string) {
  return String(req.headers.get(name) || "").trim();
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

const unauthorized = () => errorResponse("Request bot tidak valid (unauthorized)", 401);

export async function authenticateDiscordBotRequest(
  req: NextRequest,
  rawBody = "",
  options: AuthOptions = {},
) {
  const secret = process.env.DISCORD_BOT_API_SECRET;
  const configuredGuildId = String(process.env.DISCORD_GUILD_ID || "").trim();
  const directorChannels = parseIdList(process.env.DISCORD_DIRECTORS_CHANNEL_IDS);
  // Director channels are always allowed, even if not repeated in the list.
  const allowedChannels = new Set([
    ...parseIdList(process.env.DISCORD_ALLOWED_CHANNEL_IDS),
    ...directorChannels,
  ]);

  if (!secret || !configuredGuildId || allowedChannels.size === 0) {
    return {
      response: errorResponse("Bot API belum dikonfigurasi di server (cek env Vercel)", 503),
      context: null,
    };
  }

  const timestamp = getHeader(req, "x-meta-bot-timestamp");
  const signature = getHeader(req, "x-meta-bot-signature");
  const guildId = getHeader(req, "x-discord-guild-id");
  const channelId = getHeader(req, "x-discord-channel-id");
  const userId = getHeader(req, "x-discord-user-id");
  const usernameHeader = getHeader(req, "x-discord-username");
  const messageId = getHeader(req, "x-discord-message-id");
  const command = getHeader(req, "x-discord-command").toLowerCase();
  const timestampMs = Number(timestamp);

  if (
    !timestamp ||
    !signature ||
    !guildId ||
    !channelId ||
    !userId ||
    !messageId ||
    !command ||
    !Number.isFinite(timestampMs) ||
    Math.abs(Date.now() - timestampMs) > SIGNATURE_TOLERANCE_MS
  ) {
    return { response: unauthorized(), context: null };
  }

  const requestUrl = new URL(req.url);
  const requestTarget = canonicalRequestTarget(requestUrl);
  const canonical = buildSignaturePayload({
    timestamp,
    method: req.method,
    url: requestUrl,
    guildId,
    channelId,
    userId,
    username: usernameHeader,
    messageId,
    command,
    body: rawBody,
  });
  const expectedSignature = createHmac("sha256", secret)
    .update(canonical)
    .digest("hex");

  if (!safeEqual(signature, expectedSignature)) {
    return { response: unauthorized(), context: null };
  }

  if (guildId !== configuredGuildId || !allowedChannels.has(channelId)) {
    return {
      response: errorResponse("Channel ini tidak diizinkan memakai bot", 403),
      context: null,
    };
  }

  if (options.directorsOnly && !directorChannels.has(channelId)) {
    return {
      response: errorResponse("Command ini hanya bisa dipakai di channel direksi", 403),
      context: null,
    };
  }

  const { error: rateLimitError } = await supabaseAdmin.rpc(
    "record_discord_bot_request",
    {
      p_message_id: messageId,
      p_command: command,
      p_guild_id: guildId,
      p_channel_id: channelId,
      p_user_id: userId,
      p_request_path: `${req.method.toUpperCase()} ${requestTarget}`,
      p_max_requests: options.maxRequestsPerMinute || 120,
    },
  );
  if (rateLimitError) {
    const isRateLimited = String(rateLimitError.message || "").includes(
      "BOT_RATE_LIMITED",
    );
    return {
      response: errorResponse(
        isRateLimited
          ? "Terlalu banyak command. Tunggu 1 menit lalu coba lagi."
          : "Bot API sedang tidak tersedia (cek migration Supabase sudah dijalankan)",
        isRateLimited ? 429 : 503,
      ),
      context: null,
    };
  }

  let username = usernameHeader;
  try {
    username = decodeURIComponent(usernameHeader);
  } catch {
    // Keep the signed raw value when it is not URI encoded.
  }

  return {
    response: null,
    context: {
      guildId,
      channelId,
      userId,
      username,
      messageId,
      command,
    } satisfies DiscordBotRequestContext,
  };
}

export async function readDiscordBotJson(
  req: NextRequest,
  options: AuthOptions = {},
) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
    return {
      response: errorResponse("Isi command terlalu panjang", 413),
      context: null,
      body: null,
    };
  }

  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_JSON_BODY_BYTES) {
    return {
      response: errorResponse("Isi command terlalu panjang", 413),
      context: null,
      body: null,
    };
  }
  const auth = await authenticateDiscordBotRequest(req, rawBody, options);
  if (auth.response) return { ...auth, body: null };

  try {
    const body = rawBody ? JSON.parse(rawBody) : {};
    return {
      ...auth,
      body: body && typeof body === "object" && !Array.isArray(body) ? body : {},
    };
  } catch {
    return {
      response: errorResponse("Body request harus JSON yang valid", 400),
      context: auth.context,
      body: null,
    };
  }
}
