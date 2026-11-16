"use client";
import { useState, type FormEvent } from "react";
import { Globe, Loader2, Search } from "lucide-react";
import { useApiQuery } from "@/hooks/api/useApiQuery";
import {
  VisitorIpDetail,
  visitorTime,
} from "@/components/admin/visitor-ip-detail";
import type { VisitorList } from "@/interface/visitor-logs";
const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent";
export default function VisitorLogsPage() {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [hostname, setHostname] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const auth = useApiQuery<{ data: { role: string } }>(
    ["admin-auth-me"],
    "/admin/auth/me",
    undefined,
    { staleTime: 300000 },
  );
  const isRoot = auth.data?.data.role === "root";
  const params = new URLSearchParams({ search, hostname, page: String(page) });
  const query = useApiQuery<{ success: boolean; data: VisitorList }>(
    ["visitor-logs", search, hostname, page],
    `/admin/visitor-logs?${params}`,
    undefined,
    { enabled: isRoot },
  );
  const data = query.data?.data;
  function filter(event: FormEvent) {
    event.preventDefault();
    setSearch(draft.trim());
    setPage(1);
  }
  if (auth.isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (!isRoot) return <p>Akses hanya untuk direksi.</p>;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Globe className="h-6 w-6 text-accent" />
          Visitor Logs
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          IP unik yang mengakses meta-peptides.com dan metawellness.id. Klik IP
          untuk memeriksa lokasi, ISP, perangkat, dan akun terkait.
        </p>
      </header>
      <div className="rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        Satu baris untuk setiap IP; kunjungan ulang tidak membuat log baru.
        Browser/perangkat baru ditambahkan ke detail IP. Email notifikasi guest
        sudah diganti dengan pencatatan ini. Lokasi IP merupakan perkiraan
        jaringan; nama/telepon hanya tersedia jika pernah diberikan melalui akun
        atau checkout.
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <form onSubmit={filter} className="flex min-w-0 flex-wrap gap-2">
          <input
            aria-label="Cari IP, ISP, kota atau ASN"
            className={`${field} w-64 max-w-full`}
            placeholder="IP, ISP, kota, negara, ASN..."
            maxLength={100}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground">
            <Search className="mr-1 inline h-4 w-4" />
            Cari
          </button>
        </form>
        <select
          aria-label="Filter domain"
          className={field}
          value={hostname}
          onChange={(e) => {
            setHostname(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Kedua domain</option>
          <option value="meta-peptides.com">meta-peptides.com</option>
          <option value="metawellness.id">metawellness.id</option>
        </select>
      </div>
      {query.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400/30 p-4 text-sm"
        >
          <p>{query.error.message || "Gagal memuat log pengunjung."}</p>
          <button
            className="mt-3 rounded-xl border border-border px-3 py-2"
            onClick={() => query.refetch()}
          >
            Muat Ulang
          </button>
        </div>
      ) : (
        data && (
          <>
            <p className="text-sm text-muted-foreground">
              {data.pagination.total} IP unik dalam filter ini
            </p>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    {[
                      "IP",
                      "Domain",
                      "Lokasi perkiraan",
                      "ISP / ASN",
                      "Perangkat / akun",
                      "Pertama terlihat (WIB)",
                    ].map((label) => (
                      <th key={label} className="p-4 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="max-w-[230px] p-4">
                        <button
                          className="break-all text-left font-mono text-accent underline underline-offset-4"
                          onClick={() => setSelected(row.id)}
                        >
                          {row.ip_address}
                        </button>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {row.hostnames.map((host) => (
                          <p key={host}>{host}</p>
                        ))}
                      </td>
                      <td className="p-4">
                        <p>
                          {[
                            row.geo.city,
                            row.geo.region,
                            row.geo.country || row.geo.country_code,
                          ]
                            .filter(Boolean)
                            .join(", ") || "Belum tersedia"}
                        </p>
                        {row.geo_status === "unavailable" && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Lookup belum tersedia
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <p>
                          {row.geo.isp ||
                            row.geo.organization ||
                            "Belum tersedia"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.geo.asn}
                        </p>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        <p>
                          {row.visitor_ip_devices?.[0]?.count || 0}{" "}
                          browser/perangkat
                        </p>
                        <p className="mt-1">
                          {row.visitor_ip_identities?.[0]?.count || 0} akun
                          terkait
                        </p>
                      </td>
                      <td className="whitespace-nowrap p-4 text-xs text-muted-foreground">
                        {visitorTime(row.first_seen_at)}
                      </td>
                    </tr>
                  ))}
                  {!data.items.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-12 text-center text-muted-foreground"
                      >
                        Belum ada IP untuk filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Halaman {page} dari {data.pagination.total_pages}
              </span>
              <div className="flex gap-2">
                <button
                  className="rounded-xl border border-border px-4 py-2.5 disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Sebelumnya
                </button>
                <button
                  className="rounded-xl border border-border px-4 py-2.5 disabled:opacity-50"
                  disabled={page >= data.pagination.total_pages}
                  onClick={() => setPage(page + 1)}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </>
        )
      )}
      {selected && (
        <VisitorIpDetail id={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
