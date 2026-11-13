"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useApiQuery } from "@/hooks/api/useApiQuery";
import { api } from "@/lib/axios";
import { KPI_RULES, type KpiAdmin } from "@/lib/cs-kpi-core";
import type { KpiFinding } from "@/interface/cs-kpi";

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
export const kpiDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    : "—";
const statusLabel = {
  pending: "Menunggu tinjauan",
  confirmed: "Disahkan",
  dismissed: "Dibatalkan",
};
type Audit = {
  id: number;
  action: string;
  actor: string;
  created_at: string;
  before_value: KpiFinding | null;
  after_value: KpiFinding | null;
};
export function KpiReview({
  id,
  admins,
  onClose,
}: {
  id: string;
  admins: KpiAdmin[];
  onClose: () => void;
}) {
  const query = useApiQuery<{
    success: boolean;
    data: { finding: KpiFinding; audit: Audit[] };
  }>(["cs-kpi-detail", id], `/admin/cs-supervision/${id}`);
  const row = query.data?.data.finding;
  const [admin, setAdmin] = useState("");
  const [status, setStatus] = useState<KpiFinding["status"]>("pending");
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const client = useQueryClient();
  useEffect(() => {
    if (row) {
      setAdmin(row.admin_id || "");
      setStatus(row.status);
      setNote("");
    }
  }, [row]);
  async function save() {
    if (!row) return;
    setSaving(true);
    try {
      await api.post("/admin/cs-supervision", {
        action: "review",
        id: row.id,
        status,
        admin_id: admin || null,
        note,
        reviewer,
        version: row.version,
      });
      toast.success("Peninjauan tersimpan");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["cs-kpi"] }),
        client.invalidateQueries({ queryKey: ["cs-kpi-detail", id] }),
      ]);
    } catch (error: any) {
      toast.error(error?.message || "Gagal menyimpan peninjauan.");
      if (error?.message?.includes("berubah")) query.refetch();
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="dark max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl text-foreground sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bukti & Peninjauan</DialogTitle>
          <DialogDescription>
            Tinjau konteks dan PIC. Poin hanya masuk rekap setelah disahkan.
          </DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : query.isError ? (
          <p role="alert">Gagal memuat bukti. Muat ulang sebelum meninjau.</p>
        ) : (
          row && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-semibold">
                  {KPI_RULES[row.rule].label} · {row.points} poin
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {row.evidence.reason}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Kejadian {kpiDate(row.occurred_at)} WIB · Dicatat{" "}
                  {kpiDate(row.detected_at)} WIB ·{" "}
                  {row.source === "manual"
                    ? "Temuan manual"
                    : "Pemicu otomatis"}
                </p>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  [
                    "Customer / nomor",
                    row.evidence.customer || row.evidence.phone,
                  ],
                  ["Invoice", row.evidence.invoice],
                  [
                    "Waktu tunggu",
                    row.evidence.working_minutes !== undefined
                      ? `${row.evidence.working_minutes} menit kerja (batas ${row.evidence.threshold_minutes})`
                      : undefined,
                  ],
                  [
                    "Jadwal",
                    row.evidence.schedule
                      ? `${row.evidence.schedule.work_start}–${row.evidence.schedule.work_end} WIB`
                      : undefined,
                  ],
                  [
                    "Pesan pertama",
                    row.evidence.first_unanswered_at
                      ? kpiDate(row.evidence.first_unanswered_at)
                      : undefined,
                  ],
                  [
                    "Balasan CS",
                    row.evidence.first_unanswered_at
                      ? row.evidence.replied_at
                        ? kpiDate(row.evidence.replied_at)
                        : "Belum terlihat saat deteksi"
                      : undefined,
                  ],
                  [
                    "Order diterima",
                    row.evidence.received_at
                      ? kpiDate(row.evidence.received_at)
                      : undefined,
                  ],
                  [
                    "Order diproses",
                    row.evidence.received_at
                      ? row.evidence.processed_at
                        ? kpiDate(row.evidence.processed_at)
                        : "Belum terlihat saat deteksi"
                      : undefined,
                  ],
                  [
                    "Input aktual",
                    row.evidence.recorded_at
                      ? kpiDate(row.evidence.recorded_at)
                      : undefined,
                  ],
                  [
                    "Batas laporan",
                    row.evidence.deadline_at
                      ? kpiDate(row.evidence.deadline_at)
                      : undefined,
                  ],
                ]
                  .filter(([, value]) => value !== undefined)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 break-words">{value}</dd>
                    </div>
                  ))}
              </dl>
              {row.evidence.order_id && (
                <Link
                  href={`/panel-xyz123/orders/${encodeURIComponent(row.evidence.order_id)}`}
                  className="inline-block text-sm text-accent underline"
                >
                  Periksa order terkait
                </Link>
              )}
              {row.evidence.evidence_url?.startsWith("https://") && (
                <a
                  href={row.evidence.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 inline-block text-sm text-accent underline"
                >
                  Buka bukti tambahan
                </a>
              )}
              {Boolean(row.evidence.messages?.length) && (
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold">
                    Cuplikan chat saat pemicu terdeteksi
                  </h4>
                  {row.evidence.messages?.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-xl border p-3 ${message.direction === "out" ? "border-accent/20 bg-accent/5" : "border-border bg-card"}`}
                    >
                      <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {message.direction === "out" ? "CS" : "Customer"}
                        </span>
                        <span>{kpiDate(message.sent_at)} WIB</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {message.text}
                      </p>
                    </div>
                  ))}
                </section>
              )}
              <p className="rounded-xl bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                Ini cuplikan bukti, bukan kesimpulan otomatis. Periksa izin,
                gangguan listener, konteks konsultasi, serta pencatatan di luar
                sistem. Nomor WA bersama diatribusikan ke PIC; koreksi jika
                perlu.
              </p>
              <section className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  PIC
                  <select
                    className={field}
                    value={admin}
                    onChange={(e) => setAdmin(e.target.value)}
                  >
                    <option value="">Belum diatribusikan</option>
                    {admins.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm">
                  Keputusan
                  <select
                    className={field}
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as KpiFinding["status"])
                    }
                  >
                    {Object.entries(statusLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm sm:col-span-2">
                  Nama pemeriksa
                  <input
                    className={field}
                    value={reviewer}
                    maxLength={100}
                    onChange={(e) => setReviewer(e.target.value)}
                    placeholder="Nama direksi yang melakukan peninjauan"
                  />
                </label>
                <label className="space-y-1.5 text-sm sm:col-span-2">
                  Alasan / hasil pemeriksaan
                  <textarea
                    className={field}
                    rows={3}
                    value={note}
                    maxLength={1000}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Wajib diisi untuk mengesahkan, membatalkan, atau membuka kembali."
                  />
                </label>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Akses diverifikasi sebagai root; nama pemeriksa dicatat dari
                  isian karena akun direksi dipakai bersama.
                </p>
                <button
                  onClick={save}
                  disabled={
                    saving ||
                    !reviewer.trim() ||
                    !note.trim() ||
                    (status === "confirmed" && !admin)
                  }
                  className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50 sm:col-span-2"
                >
                  {saving ? "Menyimpan..." : "Simpan Peninjauan"}
                </button>
              </section>
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Riwayat audit</h4>
                {query.data?.data.audit.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-border p-3 text-xs"
                  >
                    <p>
                      {kpiDate(event.created_at)} WIB · {event.actor}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {event.before_value
                        ? `${statusLabel[event.before_value.status]} → ${statusLabel[event.after_value?.status || "pending"]}`
                        : "Temuan dibuat"}{" "}
                      · {event.after_value?.points} poin
                    </p>
                    {event.after_value?.review_note && (
                      <p className="mt-1 whitespace-pre-wrap">
                        {event.after_value.review_note}
                      </p>
                    )}
                  </div>
                ))}
              </section>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
