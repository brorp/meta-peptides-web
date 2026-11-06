"use client";

import { useState, type FormEvent } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getOrderReportDateInput } from "@/lib/order-report";

export function OrderExportDialog() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => `${getOrderReportDateInput().slice(0, 8)}01`);
  const [dateTo, setDateTo] = useState(getOrderReportDateInput);
  const rangeInvalid = !dateFrom || !dateTo || dateFrom > dateTo;

  async function handleExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rangeInvalid || exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const response = await fetch(`/api/admin/orders/export?${params}`, { cache: "no-store" });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || "Gagal mengexport laporan order.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `meta-peptides-orders-${dateFrom}-${dateTo}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Allow the browser to start the download before releasing its object URL.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Laporan order berhasil diexport");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengexport laporan order.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!exporting) setOpen(nextOpen); }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/30 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export XLSX
        </button>
      </DialogTrigger>
      <DialogContent className="dark max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl text-foreground sm:max-w-lg" isIconClose={!exporting}>
        <DialogHeader>
          <DialogTitle>Export Laporan Order</DialogTitle>
          <DialogDescription>
            Semua status order dalam periode pilihan, dikelompokkan per tipe order.
            File berisi ringkasan WhatsApp, Marketplace, Website, dan detail setiap invoice.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleExport} className="space-y-5" aria-busy={exporting}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              <span className="block">Dari tanggal</span>
              <input
                type="date"
                required
                value={dateFrom}
                max={dateTo || undefined}
                disabled={exporting}
                onChange={(event) => setDateFrom(event.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
              />
            </label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              <span className="block">Sampai tanggal</span>
              <input
                type="date"
                required
                value={dateTo}
                min={dateFrom || undefined}
                disabled={exporting}
                onChange={(event) => setDateTo(event.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
              />
            </label>
          </div>
          <p className={`text-xs ${rangeInvalid ? "text-red-500" : "text-muted-foreground"}`} role={rangeInvalid ? "alert" : undefined}>
            {rangeInvalid
              ? "Isi tanggal awal dan akhir yang valid, dengan tanggal awal sebelum atau sama dengan tanggal akhir."
              : "Berdasarkan tanggal order (WIB), termasuk seluruh hari pada tanggal akhir."}
          </p>
          <div className="space-y-2 rounded-xl border border-accent/20 bg-accent/5 p-4 text-xs leading-relaxed text-muted-foreground">
            <p><strong className="text-foreground">Nett invoice:</strong> total setelah diskon dan fee marketplace, tanpa ongkir.</p>
            <p><strong className="text-foreground">Nett diterima:</strong> hanya order yang ditandai sudah dibayar dan tidak cancelled.</p>
          </div>
          <DialogFooter className="gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={() => setOpen(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={rangeInvalid || exporting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              {exporting ? "Menyiapkan laporan..." : "Download XLSX"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
