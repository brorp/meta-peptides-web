"use client";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/hooks/api/useApiQuery";
import { api } from "@/lib/axios";
import { dateWib, nextDate } from "@/lib/cs-kpi-core";

const field =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-70";
type Report = {
  id: string;
  sent_at: string;
  summary: string;
  follow_up: string;
  blockers: string;
};
export default function DailyReportPage() {
  const [date, setDate] = useState(dateWib());
  const [summary, setSummary] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [blockers, setBlockers] = useState("");
  const [saving, setSaving] = useState(false);
  const client = useQueryClient();
  const query = useApiQuery<{
    success: boolean;
    data: {
      admin_name: string;
      report: Report | null;
      deadline: string;
      today: string;
    };
  }>(["cs-daily-report", date], "/admin/cs-daily-reports", {
    params: { date },
  });
  const data = query.data?.data;
  useEffect(() => {
    setSummary(data?.report?.summary || "");
    setFollowUp(data?.report?.follow_up || "");
    setBlockers(data?.report?.blockers || "");
  }, [data, date]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/cs-daily-reports", {
        report_date: date,
        summary,
        follow_up: followUp,
        blockers,
      });
      toast.success("Daily Report berhasil dikirim");
      await client.invalidateQueries({ queryKey: ["cs-daily-report", date] });
    } catch (error: any) {
      toast.error(error?.message || "Laporan gagal dikirim.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FileText className="h-6 w-6" />
          Daily Report
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catat pekerjaan hari ini, tindak lanjut, dan hambatan untuk ditinjau
          direksi.
        </p>
      </div>
      <label className="block max-w-xs space-y-2 text-sm">
        Tanggal laporan
        <input
          aria-label="Tanggal laporan"
          type="date"
          className={field}
          value={date}
          min={nextDate(dateWib(), -90)}
          max={dateWib()}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
      </label>
      {query.isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : query.isError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 p-4 text-sm text-red-400"
        >
          {(query.error as any)?.message ||
            "Daily Report belum siap. Hubungi direksi."}
        </p>
      ) : (
        data && (
          <form
            onSubmit={submit}
            className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <strong>{data.admin_name}</strong>
              <span className="text-muted-foreground">
                Batas kirim {data.deadline} WIB
              </span>
            </div>
            {data.report && (
              <p className="flex items-start gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                Terkirim{" "}
                {new Date(data.report.sent_at).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                })}{" "}
                WIB. Laporan tersimpan untuk direksi.
              </p>
            )}
            <label className="block space-y-2 text-sm">
              Ringkasan pekerjaan
              <textarea
                required
                minLength={20}
                maxLength={4000}
                rows={6}
                className={field}
                disabled={Boolean(data.report) || saving}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Customer yang ditangani, konsultasi / closing, order yang diproses, dan pekerjaan lainnya."
              />
            </label>
            <label className="block space-y-2 text-sm">
              Tindak lanjut yang masih terbuka
              <textarea
                maxLength={2000}
                rows={3}
                className={field}
                disabled={Boolean(data.report) || saving}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Customer atau order yang perlu dilanjutkan dan rencana tindak lanjutnya."
              />
            </label>
            <label className="block space-y-2 text-sm">
              Hambatan / catatan untuk direksi
              <textarea
                maxLength={2000}
                rows={3}
                className={field}
                disabled={Boolean(data.report) || saving}
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Tuliskan kendala atau izin khusus jika ada."
              />
            </label>
            {!data.report && (
              <>
                <p className="text-xs text-muted-foreground">
                  Waktu kirim dicatat otomatis. Periksa isi sebelum mengirim;
                  catatan tambahan setelah terkirim dapat disampaikan kepada
                  direksi.
                </p>
                <button
                  disabled={saving || summary.trim().length < 20}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}Kirim
                  Daily Report
                </button>
              </>
            )}
          </form>
        )
      )}
    </div>
  );
}
