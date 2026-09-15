const DEFAULT_APP_ORIGINS = [
  "https://meta-peptides.com",
  "https://www.meta-peptides.com",
  "https://metawellness.id",
  "https://www.metawellness.id",
];

function normalizeOrigin(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function getCanonicalAppOrigin() {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    DEFAULT_APP_ORIGINS[0]
  );
}

export function getTrustedRequestOrigin(requestUrl: string) {
  const requestOrigin = normalizeOrigin(requestUrl);
  const canonicalOrigin = getCanonicalAppOrigin();
  const configuredOrigins = (process.env.APP_ALLOWED_ORIGINS || "")
    .split(",")
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));
  const allowedOrigins = new Set([
    canonicalOrigin,
    ...DEFAULT_APP_ORIGINS,
    ...configuredOrigins,
  ]);

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    return requestOrigin;
  }

  if (process.env.NODE_ENV !== "production" && requestOrigin) {
    const hostname = new URL(requestOrigin).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return requestOrigin;
    }
  }

  return canonicalOrigin;
}
