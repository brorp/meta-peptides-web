"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { KPI_RULES, type KpiAdmin, type KpiConfig } from "@/lib/cs-kpi-core";
const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent";
const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export function KpiSettings({
  config,
  admins,
}: {
  config: KpiConfig;
  admins: KpiAdmin[];
}) {
  const [draft, setDraft] = useState(config);
  const [actor, setActor] = useState("");
  const [offDates, setOffDates] = useState(config.off_dates.join("\n"));
  const [saving, setSaving] = useState(false);
  const [person, setPerson] = useState<KpiAdmin | undefined>(
    admins.find((row) => row.id === config.default_admin_id) || admins[0],
  );
  const [name, setName] = useState(person?.name || "");
  const client = useQueryClient();
  async function send(body: unknown) {
    setSaving(true);
    try {
      await api.post("/admin/cs-supervision", body);
      toast.success("Pengaturan tersimpan");
      await client.invalidateQueries({ queryKey: ["cs-kpi"] });
    } catch (error: any) {
      toast.error(error?.message || "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    send({
      action: "settings",
      actor,
      config: { ...draft, off_dates: offDates.split(/[\s,]+/).filter(Boolean) },
    });
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={save}
        className="space-y-4 rounded-2xl border border-border bg-card p-5"
      >
        <h3 className="font-semibold">Jadwal & aturan supervisi</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
          />
          Aktifkan pencatatan otomatis
        </label>
        <label className="block space-y-1.5 text-sm">
          PIC utama
          <select
            className={field}
            value={draft.default_admin_id || ""}
            onChange={(e) =>
              setDraft({ ...draft, default_admin_id: e.target.value || null })
            }
          >
            <option value="">Pilih admin</option>
            {admins
              .filter((row) => row.active)
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
          </select>
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm">Hari kerja</legend>
          <div className="flex flex-wrap gap-3">
            {days.map((day, index) => (
              <label key={day} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={draft.work_days.includes(index)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      work_days: e.target.checked
                        ? [...draft.work_days, index]
                        : draft.work_days.filter((item) => item !== index),
                    })
                  }
                />
                {day}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5 text-sm">
            Mulai (WIB)
            <input
              required
              className={field}
              type="time"
              value={draft.work_start}
              onChange={(e) =>
                setDraft({ ...draft, work_start: e.target.value })
              }
            />
          </label>
          <label className="space-y-1.5 text-sm">
            Selesai (WIB)
            <input
              required
              className={field}
              type="time"
              value={draft.work_end}
              onChange={(e) => setDraft({ ...draft, work_end: e.target.value })}
            />
          </label>
        </div>
        <label className="block space-y-1.5 text-sm">
          Batas konsultasi ditinggal (menit kerja)
          <input
            required
            type="number"
            min={31}
            max={1440}
            className={field}
            value={draft.abandon_after_minutes}
            onChange={(e) =>
              setDraft({
                ...draft,
                abandon_after_minutes: Number(e.target.value),
              })
            }
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          Batas Daily Report (WIB)
          <input
            required
            type="time"
            className={field}
            value={draft.report_deadline}
            onChange={(e) =>
              setDraft({ ...draft, report_deadline: e.target.value })
            }
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          Tanggal libur / izin seluruh CS
          <textarea
            rows={3}
            className={field}
            value={offDates}
            onChange={(e) => setOffDates(e.target.value)}
            placeholder="YYYY-MM-DD, satu tanggal per baris"
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          Nama direksi pengubah
          <input
            required
            maxLength={100}
            className={field}
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
        </label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Waktu di luar jadwal tidak menambah durasi keterlambatan. Pengaktifan
          ulang memulai periode observasi baru dan menyimpan log sebelumnya.
        </p>
        <button
          disabled={saving || !actor.trim()}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          Simpan Pengaturan
        </button>
      </form>
      <div className="space-y-5">
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Identitas CS</h3>
          <label className="block space-y-1.5 text-sm">
            Admin
            <select
              className={field}
              value={person?.id || ""}
              onChange={(e) => {
                const row = admins.find((item) => item.id === e.target.value);
                setPerson(row);
                setName(row?.name || "");
              }}
            >
              {admins.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm">
            Nama CS
            <input
              className={field}
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Saat ini satu admin utama. Daily Report staff selalu dicatat atas
            PIC utama dari pengaturan server.
          </p>
          <button
            disabled={saving || !person || !name.trim() || !actor.trim()}
            onClick={() =>
              person &&
              send({
                action: "admin",
                actor,
                id: person.id,
                name,
                discord_user_id: person.discord_user_id || "",
                active: person.active,
                report_required: person.report_required,
                work_days: person.work_days,
              })
            }
            className="rounded-xl border border-border px-4 py-2.5 text-sm disabled:opacity-50"
          >
            Simpan Nama CS
          </button>
          <p className="text-xs text-muted-foreground">
            Gunakan nama direksi pada formulir pengaturan untuk mencatat
            pengubah.
          </p>
        </section>
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Bobot poin pelanggaran</h3>
          {Object.values(KPI_RULES).map((rule) => (
            <div
              key={rule.label}
              className="flex justify-between gap-4 text-sm"
            >
              <span className="text-muted-foreground">{rule.label}</span>
              <strong className="shrink-0">{rule.points} poin</strong>
            </div>
          ))}
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            Hanya log disahkan yang menambah poin. Satu episode chat tidak
            dihitung dua kali; indikasi konsultasi yang lebih lama menaikkan
            temuan pending dari 1 menjadi 2 poin.
          </p>
        </section>
      </div>
    </div>
  );
}
