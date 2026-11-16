"use client";
import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useApiQuery } from "@/hooks/api/useApiQuery";
import { api } from "@/lib/axios";
import type { VisitorDetail } from "@/interface/visitor-logs";
export const visitorTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    : "—";
const empty = (value?: string | null) => value || "Belum tersedia";
export function VisitorIpDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const query = useApiQuery<{ success: boolean; data: VisitorDetail }>(
    ["visitor-ip-detail", id],
    `/admin/visitor-logs/${id}`,
  );
  const data = query.data?.data;
  const [loading, setLoading] = useState(false);
  const client = useQueryClient();
  const geo = data?.ip.geo;
  const coords = geo?.latitude !== undefined && geo?.longitude !== undefined;
  const map = coords
    ? `https://www.openstreetmap.org/?mlat=${geo!.latitude}&mlon=${geo!.longitude}#map=10/${geo!.latitude}/${geo!.longitude}`
    : null;
  const bbox = coords
    ? [
        Math.max(-180, geo!.longitude! - 0.15),
        Math.max(-90, geo!.latitude! - 0.15),
        Math.min(180, geo!.longitude! + 0.15),
        Math.min(90, geo!.latitude! + 0.15),
      ].join(",")
    : null;
  async function lookup() {
    setLoading(true);
    try {
      const result = await api.post(`/admin/visitor-logs/${id}`);
      toast.success(
        result.data?.data?.status === "ready"
          ? "Informasi IP diperbarui"
          : "Penyedia lookup belum tersedia; lokasi awal tetap tersimpan.",
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ["visitor-ip-detail", id] }),
        client.invalidateQueries({ queryKey: ["visitor-logs"] }),
      ]);
    } catch (error: any) {
      toast.error(error?.message || "Lookup IP gagal.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="dark max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl text-foreground sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="break-all">
            {data?.ip.ip_address || "Detail IP"}
          </DialogTitle>
          <DialogDescription>
            Info jaringan, perkiraan lokasi IP, dan data yang diberikan
            pengunjung.
          </DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : query.isError ? (
          <p role="alert">Gagal memuat detail IP.</p>
        ) : (
          data && (
            <div className="space-y-6">
              <section className="grid gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Pertama terdeteksi (WIB)
                  </p>
                  <p className="mt-1">{visitorTime(data.ip.first_seen_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Domain</p>
                  <p className="mt-1">{data.ip.hostnames.join(", ")}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Halaman awal</p>
                  <p className="mt-1 break-all">{data.ip.entry_path}</p>
                </div>
              </section>
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">Perkiraan lokasi IP</h3>
                  <button
                    disabled={loading}
                    onClick={lookup}
                    className="rounded-xl border border-border px-3 py-2 text-xs disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`mr-1 inline h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                    Perbarui Lookup
                  </button>
                </div>
                <p className="text-sm">
                  {[geo?.city, geo?.region, geo?.country || geo?.country_code]
                    .filter(Boolean)
                    .join(", ") || "Lokasi belum tersedia"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Lokasi jaringan diperkirakan dari IP. Ini tidak menunjukkan
                  GPS, alamat rumah, atau posisi pasti seseorang. VPN/proxy dan
                  jaringan seluler dapat menunjuk lokasi berbeda.
                </p>
                {map && (
                  <>
                    <iframe
                      title="Peta perkiraan lokasi IP"
                      className="h-56 w-full rounded-xl border border-border"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox!)}&layer=mapnik&marker=${geo!.latitude},${geo!.longitude}`}
                    />
                    <a
                      href={map}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-accent underline"
                    >
                      Buka di peta
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  Sumber:{" "}
                  {data.ip.geo_source === "ipquery"
                    ? "IPQuery"
                    : data.ip.geo_source === "vercel"
                      ? "Vercel edge"
                      : "Belum tersedia"}{" "}
                  · Lookup {visitorTime(data.ip.geo_checked_at)} WIB
                  {data.ip.geo_status === "unavailable"
                    ? " · Lookup eksternal belum tersedia"
                    : ""}
                </p>
              </section>
              <section className="space-y-3">
                <h3 className="font-semibold">Informasi jaringan</h3>
                <dl className="grid gap-4 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                  {[
                    ["IP lengkap", data.ip.ip_address],
                    [
                      "Jenis IP",
                      data.ip.ip_address.includes(":") ? "IPv6" : "IPv4",
                    ],
                    ["ISP", geo?.isp],
                    ["Organisasi jaringan", geo?.organization],
                    ["ASN", geo?.asn],
                    ["Zona waktu jaringan", geo?.timezone],
                    ["Kode pos perkiraan", geo?.postal_code],
                    [
                      "Koordinat perkiraan",
                      coords ? `${geo!.latitude}, ${geo!.longitude}` : null,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 break-words">{empty(value)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    ["VPN", geo?.is_vpn],
                    ["Proxy", geo?.is_proxy],
                    ["Tor", geo?.is_tor],
                    ["Hosting / datacenter", geo?.is_datacenter],
                    ["Jaringan seluler", geo?.is_mobile],
                  ].map(([label, value]) => (
                    <span
                      key={String(label)}
                      className="rounded-full border border-border px-3 py-1"
                    >
                      {String(label)}:{" "}
                      {value === true
                        ? "Terdeteksi"
                        : value === false
                          ? "Tidak terdaftar"
                          : "Tidak diketahui"}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Indikasi dari basis data penyedia, bukan bukti penggunaan atau
                  identitas seseorang.
                </p>
              </section>
              <section className="space-y-3">
                <h3 className="font-semibold">
                  Perangkat / browser ({data.device_count})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Dibedakan dari User-Agent dan client hints. Browser yang
                  berbeda atau diperbarui bisa tampil terpisah; perangkat fisik
                  dengan data browser sama bisa tergabung.
                </p>
                {data.devices.map((device) => (
                  <article
                    key={device.id}
                    className="space-y-2 rounded-xl border border-border p-4 text-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>
                        {device.metadata.device_type} ·{" "}
                        {device.metadata.browser}{" "}
                        {device.metadata.browser_version}
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        {visitorTime(device.first_seen_at)} WIB
                      </span>
                    </div>
                    <p>
                      {device.metadata.os}
                      {device.metadata.model
                        ? ` · ${device.metadata.model}`
                        : ""}{" "}
                      · {device.hostname}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bahasa: {empty(device.metadata.language)} · Platform:{" "}
                      {empty(device.metadata.platform)}
                    </p>
                    <p className="break-all text-xs text-muted-foreground">
                      User-Agent: {empty(device.metadata.user_agent)}
                    </p>
                    {device.metadata.referer && (
                      <p className="break-all text-xs text-muted-foreground">
                        Referrer awal: {device.metadata.referer}
                      </p>
                    )}
                  </article>
                ))}
                {data.device_count > 100 && (
                  <p className="text-xs text-muted-foreground">
                    Menampilkan 100 perangkat/browser terbaru.
                  </p>
                )}
              </section>
              <section className="space-y-3">
                <h3 className="font-semibold">
                  Akun / data yang pernah diberikan ({data.identity_count})
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Nama, email, dan telepon berasal dari akun atau checkout,
                  tidak dicari dari IP. Satu IP dapat dipakai beberapa orang.
                  Penerima kiriman juga dapat berbeda dari pemilik akun atau
                  pengunjung.
                </p>
                {data.identities.map((person) => (
                  <article
                    key={person.id}
                    className="space-y-3 rounded-xl border border-border p-4 text-sm"
                  >
                    <div>
                      <strong>
                        {person.profile?.full_name ||
                          (person.is_guest
                            ? "Guest / anonim"
                            : "Akun terdaftar")}
                      </strong>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        ID akun: {person.user_id} · Terkait melalui{" "}
                        {person.source} · {visitorTime(person.first_seen_at)}{" "}
                        WIB
                      </p>
                    </div>
                    {person.profile &&
                      (person.profile.email || person.profile.phone) && (
                        <dl className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              Email akun
                            </dt>
                            <dd className="break-all">
                              {empty(person.profile.email)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              Telepon profil
                            </dt>
                            <dd>{empty(person.profile.phone)}</dd>
                          </div>
                        </dl>
                      )}
                    {person.checkout_contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="space-y-1 rounded-lg bg-muted/30 p-3"
                      >
                        <p className="text-xs text-muted-foreground">
                          Data penerima saat checkout ·{" "}
                          {visitorTime(contact.created_at)} WIB
                        </p>
                        <p>
                          {empty(contact.shipping_name)} ·{" "}
                          {empty(contact.shipping_phone)}
                        </p>
                        {contact.shipping_email && (
                          <p className="break-all">{contact.shipping_email}</p>
                        )}
                        <Link
                          href={`/panel-xyz123/orders/${contact.id}`}
                          className="inline-block text-xs text-accent underline"
                        >
                          Periksa order
                        </Link>
                      </div>
                    ))}
                    {!person.profile?.full_name &&
                      !person.profile?.phone &&
                      !person.checkout_contacts.length && (
                        <p className="text-xs text-muted-foreground">
                          Pengunjung belum memberikan nama atau nomor telepon.
                        </p>
                      )}
                  </article>
                ))}
                {!data.identities.length && (
                  <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                    Belum ada akun atau data personal yang ditautkan ke IP ini.
                  </p>
                )}
                {data.identity_count > 50 && (
                  <p className="text-xs text-muted-foreground">
                    Menampilkan 50 akun terbaru dan maksimal 100 referensi
                    checkout terbaru.
                  </p>
                )}
              </section>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
