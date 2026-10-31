// Request signing shared by the Discord bot worker and the /api/bot routes.
// No imports so it can be tested directly. Must stay identical to
// canonicalTarget() and signRequest() in discord-bot/api-client.mjs.

// Decoding the path and sorting the query keeps the signature stable even if
// a proxy re-encodes the URL (for example "%20" vs "+").
export function canonicalRequestTarget(url: URL) {
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

export function buildSignaturePayload(parts: {
  timestamp: string;
  method: string;
  url: URL;
  guildId: string;
  channelId: string;
  userId: string;
  username: string;
  messageId: string;
  command: string;
  body: string;
}) {
  return [
    parts.timestamp,
    parts.method.toUpperCase(),
    canonicalRequestTarget(parts.url),
    parts.guildId,
    parts.channelId,
    parts.userId,
    parts.username,
    parts.messageId,
    parts.command,
    parts.body,
  ].join("\n");
}
