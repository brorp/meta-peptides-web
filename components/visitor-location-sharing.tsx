"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { LOCATION_OPTIONS, LOCATION_REFRESH_MS, LOCATION_SEND_MS, locationAccuracy } from "@/lib/visitor-location";

async function send(body: object, keepalive = false) {
  const response = await fetch("/api/visitor-location", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), credentials: "same-origin", cache: "no-store",
    keepalive, signal: keepalive ? undefined : AbortSignal.timeout(12_000),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message || "Lokasi belum dapat diperbarui."), { status: response.status });
  return result.data;
}
function finish(sessionId: string) {
  const body = { mode: "stop", session_id: sessionId };
  if (navigator.sendBeacon?.("/api/visitor-location", new Blob([JSON.stringify(body)], { type: "application/json" }))) return;
  void send(body, true).catch(() => {});
}

export function VisitorLocationSharing() {
  const [session, setSession] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState("");
  const [accuracy, setAccuracy] = useState("");
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false, watch: number | null = null, timer: ReturnType<typeof setTimeout> | undefined;
    let pending: GeolocationPosition | null = null, sending = false, reading = false, lastSent = 0;
    let pause: Promise<unknown> = Promise.resolve();
    const geo = navigator.geolocation;
    const clear = () => {
      if (watch !== null) geo.clearWatch(watch);
      watch = null;
      clearTimeout(timer); timer = undefined; pending = null;
    };
    async function publish() {
      timer = undefined;
      if (cancelled || document.hidden || !pending || sending) return;
      const delay = lastSent + LOCATION_SEND_MS - Date.now();
      if (delay > 0) { timer = setTimeout(publish, delay); return; }
      const fix = pending; pending = null; sending = true; lastSent = Date.now();
      try {
        const result = await send({
          mode: "update", session_id: session,
          latitude: fix.coords.latitude, longitude: fix.coords.longitude,
          accuracy_m: fix.coords.accuracy, observed_at: new Date(fix.timestamp).toISOString(),
        });
        if (!cancelled && !document.hidden && result.status === "saved") {
          setAccuracy(locationAccuracy(fix.coords.accuracy));
          setStatus(`Berbagi lokasi aktif · diperbarui ${new Date().toLocaleTimeString("id-ID")}`);
        }
      } catch (error: any) {
        if (!cancelled) {
          setStatus(error.message || "Lokasi belum dapat diperbarui.");
          if (error.status === 401 || error.status === 429) setSession(null);
        }
      } finally {
        sending = false;
        if (!cancelled && pending && !timer) timer = setTimeout(publish, LOCATION_SEND_MS);
      }
    }
    function success(position: GeolocationPosition) {
      if (cancelled || document.hidden || !Number.isFinite(position.coords.latitude)
        || !Number.isFinite(position.coords.longitude) || !Number.isFinite(position.coords.accuracy)) return;
      if (!pending || position.timestamp >= pending.timestamp) pending = position;
      if (!sending && !timer) void publish();
    }
    function failure(error: GeolocationPositionError) {
      if (cancelled || document.hidden) return;
      if (error.code === 1) {
        setSession(null);
        setStatus("Izin lokasi tidak diberikan. Anda tetap dapat menggunakan situs seperti biasa.");
      } else setStatus("Menunggu lokasi perangkat. Pastikan layanan lokasi perangkat aktif.");
    }
    function resume() {
      if (cancelled || document.hidden || watch !== null) return;
      setStatus("Mencari lokasi perangkat dengan akurasi terbaik yang tersedia…");
      watch = geo.watchPosition(success, failure, LOCATION_OPTIONS);
    }
    async function visibility() {
      if (document.hidden) {
        clear(); setStatus("Berbagi lokasi dijeda saat halaman tidak aktif.");
        pause = send({ mode: "pause", session_id: session }, true).catch(() => {});
      } else { await pause; resume(); }
    }
    const interval = setInterval(() => {
      if (cancelled || document.hidden || reading) return;
      reading = true;
      geo.getCurrentPosition((position) => { reading = false; success(position); },
        (error) => { reading = false; failure(error); }, LOCATION_OPTIONS);
    }, LOCATION_REFRESH_MS);
    const pagehide = () => { finish(session); setSession(null); setStatus("Berbagi lokasi dihentikan."); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pagehide);
    resume();
    return () => {
      cancelled = true; clear(); clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pagehide);
      finish(session);
    };
  }, [session]);

  async function start() {
    if (!navigator.geolocation) { setStatus("Browser ini belum mendukung berbagi lokasi."); return; }
    setStarting(true); setStatus(""); setAccuracy("");
    try {
      const result = await send({ mode: "start", consent: true });
      if (!mounted.current) { finish(result.session_id); return; }
      setSession(result.session_id);
    } catch (error: any) { if (mounted.current) setStatus(error.message); }
    finally { if (mounted.current) setStarting(false); }
  }
  return (
    <section aria-label="Berbagi lokasi opsional" className="mx-auto my-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/20 p-5">
        <div className="max-w-3xl text-sm">
          <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4" />Bagikan lokasi (opsional)</h2>
          <p className="mt-2 text-muted-foreground">
            Dengan izin Anda, pengelola situs menyimpan lokasi perangkat terakhir, radius akurasi,
            dan waktu pembaruan untuk analisis kunjungan. Lokasi diperbarui selama halaman aktif.
            Anda dapat berhenti kapan saja; penggunaan situs tetap tersedia tanpa berbagi lokasi.
          </p>
          {status && <p role="status" className="mt-2">{status}{session && accuracy ? ` · Akurasi ${accuracy}` : ""}</p>}
        </div>
        {session ? (
          <button onClick={() => { setSession(null); setStatus("Berbagi lokasi dihentikan."); }} className="self-start rounded-xl border border-border px-4 py-2.5 text-sm font-medium">Berhenti berbagi lokasi</button>
        ) : (
          <button disabled={starting} onClick={start} className="self-start rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50">
            {starting && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}Izinkan berbagi lokasi
          </button>
        )}
      </div>
    </section>
  );
}
