"use client";

import { useEffect, useState } from "react";
import type { VisitorLocation } from "@/lib/visitor-location";
import { locationAccuracy, locationIsFresh } from "@/lib/visitor-location";
const time = (value: string) => new Date(value).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

export function VisitorDeviceLocations({ locations, available }: { locations: VisitorLocation[]; available: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  return (
    <section className="space-y-3" aria-label="Lokasi perangkat">
      <h3 className="font-semibold">Lokasi perangkat · pembaruan otomatis</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Dibagikan dengan izin pengunjung. Setiap sesi browser ditampilkan terpisah, termasuk saat
        menggunakan IP yang sama. Aktif berarti ada pembacaan baru dalam 45 detik terakhir;
        pembaruan berhenti ketika halaman ditutup atau izin dicabut. Akurasi mengikuti perangkat,
        dan koordinat yang dilaporkan browser belum membuktikan identitas atau posisi seseorang.
      </p>
      {!locations.length && <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
        {available ? "Belum ada lokasi perangkat yang dibagikan. Estimasi jaringan IP tersedia sebagai cadangan di bawah."
          : "Penyimpanan lokasi perangkat belum tersedia. Estimasi jaringan IP tetap tersedia di bawah."}
      </p>}
      {locations.map((location) => {
        const fresh = locationIsFresh(location, now);
        const radius = Math.max(location.accuracy_m, 100);
        const latDelta = Math.min(85, radius / 111_320 * 1.5);
        const lonDelta = Math.min(180, latDelta / Math.max(0.05, Math.cos(location.latitude * Math.PI / 180)));
        const bbox = [Math.max(-180, location.longitude-lonDelta), Math.max(-90, location.latitude-latDelta),
          Math.min(180, location.longitude+lonDelta), Math.min(90, location.latitude+latDelta)].join(",");
        return (
          <article key={location.session_id} className="space-y-3 rounded-xl border border-border p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{location.device?.metadata.device_type || "Browser"} · {location.device?.metadata.browser || "Sesi"} · {location.session_id.slice(0, 8)}</strong>
              <span className={fresh ? "text-emerald-500" : "text-muted-foreground"}>{fresh ? "Aktif · lokasi terbaru" : location.ended_at ? "Berbagi dihentikan · lokasi terakhir" : "Tidak aktif · lokasi terakhir"}</span>
            </div>
            <p>Sumber: lokasi perangkat via browser · Akurasi {locationAccuracy(location.accuracy_m)}</p>
            <p className="font-mono text-xs">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
            <p className="text-xs text-muted-foreground">Diukur: {time(location.observed_at)} WIB · Diterima: {time(location.received_at)} WIB</p>
            <p className="text-xs text-muted-foreground">{location.hostname} · Tampilan peta mencakup area sekitar koordinat; perhatikan radius akurasi di atas.</p>
            <iframe title={`Peta lokasi perangkat ${location.session_id.slice(0, 8)}`} className="h-56 w-full rounded-xl border border-border" loading="lazy" referrerPolicy="no-referrer"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${location.latitude},${location.longitude}`} />
            <a href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`} target="_blank" rel="noopener noreferrer" className="text-accent underline">Buka lokasi perangkat di peta</a>
          </article>
        );
      })}
      {locations.length >= 50 && <p className="text-xs text-muted-foreground">Menampilkan maksimal 50 sesi dengan lokasi terbaru.</p>}
    </section>
  );
}
