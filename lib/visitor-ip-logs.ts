import { supabaseAdmin } from "@/lib/supabase-server";
import {
  edgeVisitorGeo,
  parseIpQuery,
  publicIp,
  safeVisitorPath,
  safeVisitorReferer,
  visitorDevice,
  visitorHostname,
  visitorRequestIp,
  VISITOR_HOSTS,
  VISITOR_BOT_PATTERN,
  VISITOR_MIGRATION_MESSAGE,
} from "@/lib/visitor-ip-core";
import type { User } from "@supabase/supabase-js";

type IdentitySource =
  | "guest"
  | "login"
  | "register"
  | "oauth"
  | "checkout"
  | "session";
export class VisitorLogError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}
async function boundedJson(response: Response) {
  if (!response.ok || !response.body) throw Error("Lookup unavailable");
  const reader = response.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32000) {
      await reader.cancel();
      throw Error("Lookup response too large");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function enrichVisitorIp(id: string) {
  const claim = await supabaseAdmin
    .rpc("visitor_log_claim_lookup", { p_id: id })
    .abortSignal(AbortSignal.timeout(3000));
  if (claim.error) throw new VisitorLogError("Gagal memulai lookup IP.");
  if (!claim.data) return { status: "cooldown" };
  const ip = publicIp(claim.data);
  if (!ip) return { status: "unavailable" };
  let geo = null;
  try {
    const response = await fetch(
      `https://api.ipquery.io/${encodeURIComponent(ip)}?format=json`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
        redirect: "error",
      },
    );
    geo = parseIpQuery(await boundedJson(response), ip);
  } catch {
    /* Capture already persisted. An upstream outage never blocks the storefront. */
  }
  const update: any = {
    geo_status: geo ? "ready" : "unavailable",
    geo_checked_at: new Date().toISOString(),
  };
  if (geo) {
    const current = await supabaseAdmin
      .from("visitor_ip_logs")
      .select("geo")
      .eq("id", id)
      .single();
    if (current.error) throw new VisitorLogError("Gagal memuat lokasi IP.");
    update.geo = { ...current.data.geo, ...geo };
    update.geo_source = "ipquery";
  }
  const result = await supabaseAdmin
    .from("visitor_ip_logs")
    .update(update)
    .eq("id", id)
    .abortSignal(AbortSignal.timeout(3000));
  if (result.error) throw new VisitorLogError("Gagal menyimpan lookup IP.");
  return { status: update.geo_status };
}
export async function recordVisitorRequest(
  request: Request,
  identity?: {
    user: Pick<User, "id" | "is_anonymous">;
    source: IdentitySource;
  },
) {
  try {
    const development = process.env.NODE_ENV !== "production";
    const hostname = visitorHostname(request.url, development);
    const vercel = process.env.VERCEL === "1";
    const ip = visitorRequestIp(request.headers, vercel, development);
    if (!hostname || !ip) return;
    const device = visitorDevice(request.headers);
    // Auth/checkout hooks also call this directly, outside the proxy filter.
    if (device.metadata.is_bot) return;
    const result = await supabaseAdmin
      .rpc("visitor_log_record", {
        p_ip: ip,
        p_hostname: hostname,
        p_path: safeVisitorPath(request.url),
        p_device_key: device.key,
        p_device: {
          ...device.metadata,
          referer: safeVisitorReferer(request.headers.get("referer")),
        },
        p_geo: vercel ? edgeVisitorGeo(request.headers) : {},
        p_user_id: identity?.user.id || null,
        p_is_guest: identity?.user.is_anonymous ?? true,
        p_source: identity?.source || "session",
      })
      .abortSignal(AbortSignal.timeout(4000));
    if (result.error) throw Error("Capture unavailable");
    if (result.data?.created) await enrichVisitorIp(result.data.id);
  } catch {
    console.warn(
      "[Visitor Logs] Capture / enrichment unavailable; storefront request unaffected.",
    );
  }
}
export async function listVisitorIps(params: URLSearchParams) {
  const page = Math.max(
    1,
    Math.min(100000, Math.floor(Number(params.get("page")) || 1)),
  );
  const search = (params.get("search") || "").trim().slice(0, 100);
  const hostname = params.get("hostname") || "";
  if (hostname && !(VISITOR_HOSTS as readonly string[]).includes(hostname))
    throw new VisitorLogError("Domain tidak valid.", 400);
  let query = supabaseAdmin
    .from("visitor_ip_logs")
    .select(
      "id,ip_address,first_seen_at,hostnames,entry_path,geo,geo_status,geo_source,geo_checked_at,visitor_ip_devices(count),visitor_ip_identities(count),browser_agents:visitor_ip_devices!inner(metadata),locations:visitor_device_locations(session_id,accuracy_m,observed_at,received_at,sharing,ended_at)",
      { count: "exact" },
    )
    // Filter before pagination/counting. !inner retains a shared IP when it has
    // a normal browser, even if a crawler was its first recorded device.
    .not("browser_agents.metadata->>user_agent", "imatch", VISITOR_BOT_PATTERN)
    .or("metadata->>is_bot.is.null,metadata->>is_bot.neq.true", {
      referencedTable: "browser_agents",
    })
    .not("visitor_ip_devices.metadata->>user_agent", "imatch", VISITOR_BOT_PATTERN)
    .or("metadata->>is_bot.is.null,metadata->>is_bot.neq.true", {
      referencedTable: "visitor_ip_devices",
    })
    .limit(1, { referencedTable: "browser_agents" })
    .not("locations.observed_at", "is", null)
    .order("received_at", { referencedTable: "locations", ascending: false })
    .limit(1, { referencedTable: "locations" });
  if (hostname) query = query.contains("hostnames", [hostname]);
  const ip = publicIp(search);
  if (ip) query = query.eq("ip_address", ip);
  else if (search) {
    const term = search.replace(/[^\p{L}\p{N} .:-]/gu, "");
    if (!term)
      return { items: [], pagination: { page: 1, total: 0, total_pages: 1 } };
    query = query.or(
      `geo->>isp.ilike.%${term}%,geo->>organization.ilike.%${term}%,geo->>city.ilike.%${term}%,geo->>country.ilike.%${term}%,geo->>asn.ilike.%${term}%`,
    );
  }
  const result = await query
    .order("first_seen_at", { ascending: false })
    .order("id")
    .range((page - 1) * 30, page * 30 - 1);
  if (result.error) throw new VisitorLogError(VISITOR_MIGRATION_MESSAGE, 503);
  return {
    items: (result.data || []).map(({ browser_agents, ...row }) => row),
    pagination: {
      page,
      total: result.count || 0,
      total_pages: Math.max(1, Math.ceil((result.count || 0) / 30)),
    },
  };
}
export async function getVisitorIp(id: string) {
  const [ip, devices, identities, locations] = await Promise.all([
    supabaseAdmin
      .from("visitor_ip_logs")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("visitor_ip_devices")
      .select("*", { count: "exact" })
      .eq("ip_id", id)
      .not("metadata->>user_agent", "imatch", VISITOR_BOT_PATTERN)
      .or("metadata->>is_bot.is.null,metadata->>is_bot.neq.true")
      .order("first_seen_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("visitor_ip_identities")
      .select("*", { count: "exact" })
      .eq("ip_id", id)
      .order("first_seen_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("visitor_device_locations")
      .select("session_id,ip_id,device_key,hostname,latitude,longitude,accuracy_m,observed_at,received_at,consented_at,sharing,ended_at,device:visitor_ip_devices(metadata)")
      .eq("ip_id", id)
      .not("observed_at", "is", null)
      .order("received_at", { ascending: false })
      .limit(50),
  ]);
  if (ip.error || devices.error || identities.error)
    throw new VisitorLogError("Gagal memuat detail IP.");
  if (!ip.data || !devices.data?.length)
    throw new VisitorLogError("IP tidak ditemukan.", 404);
  if (locations.error && !["42P01", "PGRST205"].includes(locations.error.code))
    throw new VisitorLogError("Gagal memuat lokasi perangkat.");
  const users = (identities.data || []).map((row) => row.user_id);
  const [profiles, orders] = users.length
    ? await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id,full_name,email,phone")
          .in("id", users),
        supabaseAdmin
          .from("orders")
          .select(
            "id,user_id,shipping_name,shipping_email,shipping_phone,created_at",
          )
          .in("user_id", users)
          .order("created_at", { ascending: false })
          .limit(100),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (profiles.error || orders.error)
    throw new VisitorLogError("Gagal memuat data akun terkait.");
  return {
    ip: ip.data,
    devices: devices.data,
    device_locations: locations.data || [],
    locations_available: !locations.error,
    device_count: devices.count || 0,
    identity_count: identities.count || 0,
    identities: (identities.data || []).map((row) => ({
      ...row,
      profile:
        profiles.data?.find((person) => person.id === row.user_id) || null,
      checkout_contacts: (orders.data || []).filter(
        (order) => order.user_id === row.user_id,
      ),
    })),
  };
}
