import { BlockList, isIP } from "node:net";
import { createHash } from "node:crypto";

export const VISITOR_HOSTS = ["meta-peptides.com", "metawellness.id"] as const;
export const VISITOR_MIGRATION_MESSAGE =
  "Visitor Logs belum siap. Jalankan migration 20261116090000_add_visitor_ip_logs.sql.";
const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(address, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
export function publicIp(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 64) return null;
  let raw = value.trim();
  if (isIP(raw) === 6) {
    raw = new URL(`http://[${raw}]/`).hostname.slice(1, -1);
    const mapped = raw.match(/^::ffff:([a-f0-9]+):([a-f0-9]+)$/);
    if (mapped) {
      const a = parseInt(mapped[1], 16),
        b = parseInt(mapped[2], 16);
      raw = `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
    }
  }
  const version = isIP(raw);
  if (version === 4) return blocked.check(raw, "ipv4") ? null : raw;
  if (version === 6)
    return globalV6.check(raw, "ipv6") && !blocked.check(raw, "ipv6")
      ? raw
      : null;
  return null;
}
export function visitorHostname(requestUrl: string, development = false) {
  const hostname = new URL(requestUrl).hostname
    .toLowerCase()
    .replace(/^www\./, "");
  return (VISITOR_HOSTS as readonly string[]).includes(hostname) ||
    (development && hostname === "localhost")
    ? hostname
    : null;
}
export function visitorRequestIp(
  headers: Headers,
  vercel = false,
  development = false,
) {
  // Production fails closed outside Vercel rather than trusting user-supplied XFF.
  if (!vercel && !development) return null;
  const raw = vercel
    ? headers.get("x-vercel-forwarded-for") || headers.get("x-forwarded-for")
    : headers.get("x-forwarded-for");
  // Vercel overwrites this header; do not accept client-controlled IP chains.
  return publicIp(raw);
}
const clip = (value: unknown, max = 200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
function headerText(headers: Headers, key: string, max = 200) {
  try {
    return clip(decodeURIComponent(headers.get(key) || ""), max);
  } catch {
    return clip(headers.get(key), max);
  }
}
function coordinate(value: unknown, limit: number) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}
export type VisitorGeo = {
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  postal_code?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  organization?: string;
  asn?: string;
  is_mobile?: boolean;
  is_vpn?: boolean;
  is_proxy?: boolean;
  is_tor?: boolean;
  is_datacenter?: boolean;
};
export function edgeVisitorGeo(headers: Headers): VisitorGeo {
  const result: VisitorGeo = {};
  for (const [field, key] of [
    ["country_code", "country"],
    ["region", "country-region"],
    ["city", "city"],
    ["postal_code", "postal-code"],
    ["timezone", "timezone"],
  ] as const) {
    const value = headerText(headers, `x-vercel-ip-${key}`);
    if (value) result[field] = value;
  }
  const lat = coordinate(headers.get("x-vercel-ip-latitude"), 90),
    lon = coordinate(headers.get("x-vercel-ip-longitude"), 180);
  if (lat !== null && lon !== null && Object.keys(result).length) {
    result.latitude = lat;
    result.longitude = lon;
  }
  return result;
}
export function parseIpQuery(data: any, expectedIp: string): VisitorGeo | null {
  if (!data || publicIp(data.ip) !== expectedIp) return null;
  const result: VisitorGeo = {};
  for (const [field, source] of [
    ["country", "country"],
    ["country_code", "country_code"],
    ["region", "state"],
    ["city", "city"],
    ["postal_code", "zipcode"],
    ["timezone", "timezone"],
  ] as const) {
    const value = clip(data.location?.[source]);
    if (value) result[field] = value;
  }
  for (const [field, source] of [
    ["isp", "isp"],
    ["organization", "org"],
    ["asn", "asn"],
  ] as const) {
    const value = clip(data.isp?.[source], 300);
    if (value) result[field] = value;
  }
  const lat = coordinate(data.location?.latitude, 90),
    lon = coordinate(data.location?.longitude, 180);
  if (lat !== null && lon !== null && (result.city || result.country_code)) {
    result.latitude = lat;
    result.longitude = lon;
  }
  for (const key of [
    "is_mobile",
    "is_vpn",
    "is_proxy",
    "is_tor",
    "is_datacenter",
  ] as const)
    if (typeof data.risk?.[key] === "boolean") result[key] = data.risk[key];
  return Object.keys(result).length ? result : null;
}
// Keep this pattern compatible with JavaScript and PostgreSQL ARE (PostgREST
// imatch), so capture and historical filtering make the same decision.
export const VISITOR_BOT_PATTERN =
  "facebookexternalhit|meta-(externalagent|externalfetcher|externalads|webindexer)|facebot|bot([^a-z0-9_]|$)|crawler|spider|slurp|headless|curl/|wget/|python-requests|python-urllib|aiohttp|Go-http-client/|PostmanRuntime/|monitor|^https?://";
const visitorBotPattern = new RegExp(VISITOR_BOT_PATTERN, "i");
export function visitorAutomation(userAgent: string): string | null {
  if (/^facebookexternalhit(?:\/|\s|$)/i.test(userAgent))
    return "Meta link preview";
  if (
    /^(?:meta-(?:externalagent|externalfetcher|externalads|webindexer)|facebot)(?:\/|\s|$)/i.test(
      userAgent,
    )
  )
    return "Meta crawler";
  return visitorBotPattern.test(userAgent) ? "Bot / automation" : null;
}
export function visitorDevice(headers: Headers) {
  const ua = clip(headers.get("user-agent"), 1600);
  const automation = visitorAutomation(ua);
  const bot = Boolean(automation);
  const tablet =
    /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ||
    (/Macintosh/.test(ua) && /Mobile/.test(ua));
  const device_type = bot
    ? "Bot / automation"
    : tablet
      ? "Tablet"
      : /Mobi|iPhone|Android/i.test(ua)
        ? "Mobile"
        : ua
          ? "Desktop"
          : "Unknown";
  const browserTests = [
    [/Edg(?:e|A|iOS)?\/([\d.]+)/, "Edge"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
    [/(?:Firefox|FxiOS)\/([\d.]+)/, "Firefox"],
    [/(?:Chrome|CriOS)\/([\d.]+)/, "Chrome"],
    [/Version\/([\d.]+).*Safari/, "Safari"],
  ] as const;
  let browser = automation || "Unknown",
    browser_version = "";
  if (!bot)
    for (const [pattern, name] of browserTests) {
      const match = ua.match(pattern);
      if (match) {
        browser = name;
        browser_version = match[1];
        break;
      }
    }
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(ua) || (tablet && /Macintosh/.test(ua))
      ? "iOS / iPadOS"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Macintosh|Mac OS/i.test(ua)
          ? "macOS"
          : /CrOS/i.test(ua)
            ? "ChromeOS"
            : /Linux/i.test(ua)
              ? "Linux"
              : "Unknown";
  const model = clip(headers.get("sec-ch-ua-model"), 150).replace(/^"|"$/g, "");
  const platform = clip(headers.get("sec-ch-ua-platform"), 100).replace(
    /^"|"$/g,
    "",
  );
  const key = createHash("sha256")
    .update(JSON.stringify([ua, model, platform]))
    .digest("hex");
  return {
    key,
    metadata: {
      user_agent: ua,
      device_type,
      browser,
      browser_version,
      os,
      model,
      platform,
      language: clip(headers.get("accept-language"), 200),
      is_bot: bot,
    },
  };
}
export function safeVisitorPath(url: string) {
  return new URL(url).pathname.slice(0, 1024);
}
export function safeVisitorReferer(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol)
      ? `${url.origin}${url.pathname}`.slice(0, 1000)
      : null;
  } catch {
    return null;
  }
}
export function shouldLogVisitor(request: Request) {
  const path = new URL(request.url).pathname;
  return (
    ["GET", "HEAD"].includes(request.method) &&
    !visitorAutomation(request.headers.get("user-agent") || "") &&
    !/^\/(?:api(?:\/|$)|_next(?:\/|$)|panel-xyz123(?:\/|$)|login-panel(?:\/|$))/.test(
      path,
    ) &&
    !request.headers.has("rsc") &&
    !request.headers.has("next-router-prefetch") &&
    request.headers.get("purpose") !== "prefetch" &&
    !/\.(?:js|css|png|jpe?g|gif|webp|svg|ico|mp4|woff2?|txt|xml|map|pdf)$/i.test(
      path,
    )
  );
}
export function visitorMapUrl(geo: VisitorGeo) {
  return typeof geo.latitude === "number" && typeof geo.longitude === "number"
    ? `https://www.openstreetmap.org/?mlat=${geo.latitude}&mlon=${geo.longitude}#map=10/${geo.latitude}/${geo.longitude}`
    : null;
}
