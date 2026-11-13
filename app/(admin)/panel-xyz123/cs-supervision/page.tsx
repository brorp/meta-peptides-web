"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiQuery } from "@/hooks/api/useApiQuery";
import { api } from "@/lib/axios";
import { dateWib, KPI_RULES, RULE_KEYS, type KpiRule } from "@/lib/cs-kpi-core";
import { KpiReview, kpiDate } from "@/components/admin/cs-kpi-review";
import { KpiSettings } from "@/components/admin/cs-kpi-settings";
import type { KpiDashboard } from "@/interface/cs-kpi";

const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent";
const button =
  "rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50";
const statuses = {
  pending: "Menunggu tinjauan",
  confirmed: "Disahkan",
  dismissed: "Dibatalkan",
};
const tabs = {
  logs: "Log Temuan",
  summary: "Rekap Bulanan",
  reports: "Daily Reports",
  settings: "Pengaturan",
};

function ManualFinding({
  data,
  onClose,
}: {
  data: KpiDashboard;
  onClose: () => void;
}) {
  const [rule, setRule] = useState<KpiRule>("reply_late");
  const [admin, setAdmin] = useState(data.config.default_admin_id || "");
  const [occurred, setOccurred] = useState(`${dateWib()}T10:00`);
  const [actor, setActor] = useState("");
  const [reason, setReason] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const client = useQueryClient();
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/cs-supervision", {
        action: "manual",
        rule,
        admin_id: admin || null,
        actor,
        reason,
        evidence_url: url,
        occurred_at: new Date(`${occurred}:00+07:00`).toISOString(),
      });
      toast.success("Temuan manual dicatat untuk ditinjau");
      await client.invalidateQueries({ queryKey: ["cs-kpi"] });
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Gagal mencatat temuan.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2"
    >
      <h2 className="font-semibold sm:col-span-2">Catat temuan manual</h2>
      <label className="grid gap-1.5 text-sm">
        Pelanggaran
        <select
          className={field}
          value={rule}
          onChange={(e) => setRule(e.target.value as KpiRule)}
        >
          {RULE_KEYS.map((key) => (
            <option key={key} value={key}>
              {KPI_RULES[key].label} ({KPI_RULES[key].points} poin)
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm">
        PIC
        <select
          className={field}
          value={admin}
          onChange={(e) => setAdmin(e.target.value)}
        >
          <option value="">Belum diatribusikan</option>
          {data.admins.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm">
        Waktu kejadian (WIB)
        <input
          required
          type="datetime-local"
          className={field}
          value={occurred}
          onChange={(e) => setOccurred(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        Nama direksi pencatat
        <input
          required
          maxLength={100}
          className={field}
          value={actor}
          onChange={(e) => setActor(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-sm sm:col-span-2">
        Kesalahan & konteks
        <textarea
          required
          minLength={10}
          maxLength={4000}
          rows={3}
          className={field}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-sm sm:col-span-2">
        Link bukti tambahan (opsional, HTTPS)
        <input
          type="url"
          pattern="https://.*"
          maxLength={1000}
          className={field}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        Temuan ini berstatus menunggu tinjauan. Poin belum masuk rekap sebelum
        disahkan.
      </p>
      <div className="flex gap-2 sm:col-span-2">
        <button
          disabled={saving}
          className={`${button} bg-accent text-accent-foreground`}
        >
          {saving ? "Menyimpan..." : "Catat Temuan"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          className={button}
        >
          Tutup
        </button>
      </div>
    </form>
  );
}

export default function CsSupervisionPage() {
  const [month, setMonth] = useState(dateWib().slice(0, 7));
  const [tab, setTab] = useState<keyof typeof tabs>("logs");
  const [status, setStatus] = useState("");
  const [admin, setAdmin] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [scanning, setScanning] = useState(false);
  const auth = useApiQuery<{ success: boolean; data: { role: string } }>(
    ["admin-auth-me"],
    "/admin/auth/me",
    undefined,
    { staleTime: 5 * 60 * 1000 },
  );
  const isRoot = auth.data?.data?.role === "root";
  const params = new URLSearchParams({
    month,
    status,
    admin_id: admin,
    page: String(page),
  });
  const query = useApiQuery<{ success: boolean; data: KpiDashboard }>(
    ["cs-kpi", month, status, admin, page],
    `/admin/cs-supervision?${params}`,
    undefined,
    { enabled: isRoot, refetchInterval: 60000 },
  );
  const data = query.data?.data;
  const client = useQueryClient();
  async function scan() {
    setScanning(true);
    try {
      const result = await api.post("/admin/cs-supervision", {
        action: "scan",
      });
      const state = result.data?.data;
      toast.success(
        state?.status === "disabled"
          ? "Pencatatan otomatis sedang nonaktif"
          : state?.status === "running"
            ? "Pemeriksaan masih berjalan"
            : `Pemeriksaan selesai: ${state?.recorded || 0} temuan baru / diperbarui`,
      );
      await client.invalidateQueries({ queryKey: ["cs-kpi"] });
    } catch (error: any) {
      toast.error(error?.message || "Pemeriksaan gagal.");
    } finally {
      setScanning(false);
    }
  }
  if (auth.isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (!isRoot) return <p>Akses hanya untuk direksi.</p>;
  const chatHealthy =
    data?.listener_connected &&
    data.listener_heartbeat_at &&
    Date.now() - new Date(data.listener_heartbeat_at).getTime() < 300000;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ShieldCheck className="h-6 w-6 text-accent" />
            CS Supervision
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Log kesalahan, bukti percakapan, dan peninjauan direksi. Poin
            pelanggaran dihitung setelah disahkan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            onClick={() => setManual(!manual)}
            disabled={!data}
          >
            <Plus className="mr-1 inline h-4 w-4" />
            Temuan Manual
          </button>
          <button
            className={button}
            onClick={scan}
            disabled={scanning || !data}
          >
            <RefreshCw
              className={`mr-1 inline h-4 w-4 ${scanning ? "animate-spin" : ""}`}
            />
            Periksa Sekarang
          </button>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <nav aria-label="Tab supervisi" className="flex flex-wrap gap-2">
          {Object.entries(tabs).map(([key, label]) => (
            <button
              key={key}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => setTab(key as keyof typeof tabs)}
              className={`rounded-xl px-4 py-2 text-sm ${tab === key ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <label className="flex items-center gap-2 text-sm">
          Bulan
          <input
            type="month"
            required
            value={month}
            className={field}
            onChange={(e) => {
              if (e.target.value) {
                setMonth(e.target.value);
                setPage(1);
              }
            }}
          />
        </label>
      </div>
      {query.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
      {query.isError && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm"
        >
          <p>{query.error.message || "Gagal memuat supervisi."}</p>
          <button className={`${button} mt-3`} onClick={() => query.refetch()}>
            Muat Ulang
          </button>
        </div>
      )}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Menunggu tinjauan", data.summary.pending],
              ["Disahkan", data.summary.confirmed],
              ["Dibatalkan", data.summary.dismissed],
              ["Poin pelanggaran disahkan", data.summary.confirmed_points],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1 rounded-xl border border-border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">
                {data.config.enabled ? "Supervisi aktif" : "Supervisi nonaktif"}
              </strong>{" "}
              · {data.config.work_start}–{data.config.work_end} WIB · Observasi
              mulai {kpiDate(data.monitoring_started_at)}
            </p>
            <p>
              Pemeriksaan terakhir: {kpiDate(data.last_scan_at)} WIB.{" "}
              {chatHealthy
                ? "Listener WA terhubung."
                : "Listener WA belum terhubung / sinyal kedaluwarsa. Pemicu chat dijeda; pemeriksaan order dan laporan tetap dapat berjalan."}
            </p>
            {data.last_scan_error && (
              <p className="text-amber-400">{data.last_scan_error}</p>
            )}
            <p>
              Order marketplace baru terukur setelah masuk database. Gunakan
              temuan manual jika kejadian hanya terlihat di aplikasi
              marketplace. Batas Daily Report: {data.config.report_deadline}{" "}
              WIB.
            </p>
          </div>
          {manual && (
            <ManualFinding data={data} onClose={() => setManual(false)} />
          )}
          {tab === "logs" && (
            <section className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <select
                  aria-label="Filter status"
                  className={field}
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua status</option>
                  {Object.entries(statuses).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter PIC"
                  className={field}
                  value={admin}
                  onChange={(e) => {
                    setAdmin(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua PIC</option>
                  {data.admins.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      {[
                        "Kejadian (WIB)",
                        "Pelanggaran / bukti",
                        "PIC",
                        "Poin",
                        "Status",
                        "Tinjau",
                      ].map((label) => (
                        <th key={label} className="p-4 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.findings.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="whitespace-nowrap p-4 text-xs text-muted-foreground">
                          {kpiDate(row.occurred_at)}
                        </td>
                        <td className="max-w-md p-4">
                          <p className="font-medium">
                            {KPI_RULES[row.rule].label}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {row.evidence.reason}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.source === "manual" ? "Manual" : "Otomatis"}
                            {row.evidence.invoice
                              ? ` · ${row.evidence.invoice}`
                              : row.evidence.customer
                                ? ` · ${row.evidence.customer}`
                                : ""}
                          </p>
                        </td>
                        <td className="p-4">
                          {data.admins.find(
                            (person) => person.id === row.admin_id,
                          )?.name || "Belum ditetapkan"}
                        </td>
                        <td className="p-4 font-semibold">{row.points}</td>
                        <td className="p-4 text-xs">
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 ${row.status === "pending" ? "bg-amber-400/10 text-amber-400" : row.status === "confirmed" ? "bg-red-400/10 text-red-400" : "bg-muted text-muted-foreground"}`}
                          >
                            {statuses[row.status]}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            className={button}
                            onClick={() => setSelected(row.id)}
                          >
                            Bukti & Review
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!data.findings.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-10 text-center text-muted-foreground"
                        >
                          Belum ada temuan untuk filter ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {data.pagination.total} log · Halaman {page} dari{" "}
                  {data.pagination.total_pages}
                </span>
                <div className="flex gap-2">
                  <button
                    className={button}
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Sebelumnya
                  </button>
                  <button
                    className={button}
                    disabled={page >= data.pagination.total_pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </section>
          )}
          {tab === "summary" && (
            <section className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Rekap mengikuti bulan kejadian dalam WIB. Angka merupakan
                akumulasi poin pelanggaran yang disahkan; log pending dan
                dibatalkan tidak menambah poin.
              </p>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="p-4">CS</th>
                      {RULE_KEYS.map((key) => (
                        <th className="max-w-[180px] p-4" key={key}>
                          {KPI_RULES[key].label}
                        </th>
                      ))}
                      <th className="p-4">Total poin</th>
                      <th className="p-4">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.summary.by_admin.map((row) => (
                      <tr className="border-t border-border" key={row.admin_id}>
                        <td className="p-4 font-medium">{row.name}</td>
                        {RULE_KEYS.map((key) => (
                          <td className="p-4" key={key}>
                            {row.by_rule[key] || 0}
                          </td>
                        ))}
                        <td className="p-4 text-lg font-semibold">
                          {row.confirmed_points}
                        </td>
                        <td className="p-4">{row.pending_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === "reports" && (
            <section className="space-y-4">
              {data.reports.map((report) => (
                <article
                  key={report.id}
                  className="space-y-3 rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-semibold">
                      {report.report_date} ·{" "}
                      {data.admins.find(
                        (person) => person.id === report.admin_id,
                      )?.name || "CS"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Dikirim {kpiDate(report.sent_at)} WIB
                    </p>
                  </div>
                  {[
                    ["Ringkasan kerja", report.summary],
                    ["Follow-up", report.follow_up],
                    ["Kendala", report.blockers],
                  ].map(
                    ([label, value]) =>
                      value && (
                        <div key={label}>
                          <h4 className="text-xs text-muted-foreground">
                            {label}
                          </h4>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                            {value}
                          </p>
                        </div>
                      ),
                  )}
                </article>
              ))}
              {!data.reports.length && (
                <p className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
                  Belum ada Daily Report pada bulan ini.
                </p>
              )}
            </section>
          )}
          {tab === "settings" && (
            <KpiSettings
              key={JSON.stringify([data.config, data.admins])}
              config={data.config}
              admins={data.admins}
            />
          )}
          {selected && (
            <KpiReview
              id={selected}
              admins={data.admins}
              onClose={() => setSelected(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
