import { NextRequest, after } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";
import { edgeVisitorGeo, visitorDevice, visitorHostname, visitorRequestIp } from "@/lib/visitor-ip-core";
import { enrichVisitorIp } from "@/lib/visitor-ip-logs";
import { visitorLocationInput } from "@/lib/visitor-location";
import { createLocationSession, verifyLocationSession, locationCookie, locationCookieOptions } from "@/lib/visitor-location-session";

export const maxDuration = 15;
export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const development = process.env.NODE_ENV !== "production";
  const hostname = visitorHostname(request.url, development);
  if (!hostname || request.headers.get("origin") !== origin)
    return errorResponse("Origin tidak diizinkan.", 403);
  const device = visitorDevice(request.headers);
  const ip = visitorRequestIp(request.headers, process.env.VERCEL === "1", development);
  if (device.metadata.is_bot || !ip) return errorResponse("Lokasi tidak tersedia.", 400);
  try {
    const reader = request.body?.getReader();
    if (!reader) return errorResponse("Data tidak valid.", 400);
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); return errorResponse("Data terlalu besar.", 413); }
      parts.push(value);
    }
    const input = visitorLocationInput.safeParse(JSON.parse(Buffer.concat(parts).toString("utf8")));
    if (!input.success) return errorResponse("Data lokasi tidak valid.", 400);
    const data = input.data;
    if (data.mode === "start") {
      const session = await createLocationSession(origin, device.key);
      const started = await supabaseAdmin.rpc("visitor_location_start", {
        p_session_id: session.id, p_ip: ip, p_hostname: hostname,
        p_device_key: device.key, p_device: device.metadata,
        p_geo: process.env.VERCEL === "1" ? edgeVisitorGeo(request.headers) : {},
      }).abortSignal(AbortSignal.timeout(4000));
      if (started.error) return errorResponse("Berbagi lokasi belum tersedia. Silakan coba lagi nanti.", 503);
      if (started.data?.status === "limited") return errorResponse("Terlalu banyak sesi lokasi. Coba lagi nanti.", 429);
      if (started.data?.created) after(async () => { try { await enrichVisitorIp(started.data.id); } catch { /* IP fallback is optional. */ } });
      const response = successResponse({ session_id: session.id });
      response.headers.set("Cache-Control", "no-store");
      response.cookies.set(locationCookie(session.id), session.token, locationCookieOptions);
      return response;
    }
    const token = request.cookies.get(locationCookie(data.session_id))?.value;
    if (!token || !await verifyLocationSession(token, data.session_id, origin, device.key))
      return errorResponse("Sesi berbagi lokasi berakhir. Izinkan kembali untuk melanjutkan.", 401);
    if (data.mode !== "update") {
      const result = await supabaseAdmin.rpc("visitor_location_end", {
        p_session_id: data.session_id, p_stop: data.mode === "stop",
      }).abortSignal(AbortSignal.timeout(4000));
      if (result.error) return errorResponse("Gagal menghentikan pembaruan lokasi.", 503);
      const response = successResponse({ status: data.mode === "stop" ? "ended" : "paused" });
      response.headers.set("Cache-Control", "no-store");
      if (data.mode === "stop") response.cookies.set(locationCookie(data.session_id), "", { ...locationCookieOptions, maxAge: 0 });
      return response;
    }
    const age = Date.now() - Date.parse(data.observed_at);
    if (age > 120_000 || age < -30_000) return errorResponse("Pembacaan lokasi sudah kedaluwarsa.", 400);
    const result = await supabaseAdmin.rpc("visitor_location_record", {
      p_session_id: data.session_id, p_ip: ip, p_hostname: hostname,
      p_device_key: device.key, p_device: device.metadata,
      p_geo: process.env.VERCEL === "1" ? edgeVisitorGeo(request.headers) : {},
      p_latitude: data.latitude, p_longitude: data.longitude,
      p_accuracy_m: data.accuracy_m, p_observed_at: data.observed_at,
    }).abortSignal(AbortSignal.timeout(4000));
    if (result.error) return errorResponse("Lokasi belum dapat disimpan.", 503);
    if (result.data?.status === "limited") return errorResponse("Terlalu banyak sesi lokasi. Coba lagi nanti.", 429);
    if (result.data?.status === "ended") return errorResponse("Sesi berbagi lokasi sudah dihentikan.", 401);
    if (result.data?.created) after(async () => { try { await enrichVisitorIp(result.data.id); } catch { /* IP fallback is optional. */ } });
    const response = successResponse({ status: result.data?.status });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return errorResponse("Permintaan lokasi tidak dapat diproses.", 400);
  }
}
