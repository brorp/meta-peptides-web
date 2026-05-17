"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Handshake,
  Loader2,
  MessageCircle,
  Send,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

const BUSINESS_TYPES = [
  "Online Store",
  "Community Seller",
  "Clinic / Wellness Partner",
  "Research Supply Partner",
  "Other",
];

const initialForm = {
  full_name: "",
  email: "",
  whatsapp_number: "",
  business_name: "",
  business_type: "",
  city: "",
  country: "Indonesia",
  social_link: "",
  estimated_monthly_orders: "",
  notes: "",
};

function getErrorMessage(error: any, fallback: string) {
  return error?.message || error?.error || fallback;
}

export default function ResellerRegistrationPage() {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const { data } = await axios.post("/resellers", {
        ...form,
        estimated_monthly_orders: form.estimated_monthly_orders
          ? Number(form.estimated_monthly_orders)
          : null,
      });

      if (data.success) {
        setIsSubmitted(true);
        setForm(initialForm);
        toast.success("Pendaftaran reseller berhasil dikirim");
      }
    } catch (error: any) {
      toast.error("Gagal mengirim pendaftaran", {
        description: getErrorMessage(error, "Silakan cek data lalu coba lagi."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-foreground">
      <section className="bg-[#414042] pt-36 pb-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
              <Handshake className="h-4 w-4" />
              Reseller Program
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase leading-tight tracking-tight md:text-6xl">
                Register as <span className="text-accent">Reseller</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-300 md:text-base">
                Submit your reseller profile and our team will review it from
                the Meta Peptides admin panel before contacting you on WhatsApp.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <Store className="mb-4 h-5 w-5 text-accent" />
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Sales Channel
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Online, community, or clinic partners
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <MessageCircle className="mb-4 h-5 w-5 text-accent" />
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Follow Up
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Review result will be sent by WhatsApp
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {isSubmitted ? (
          <div className="rounded-3xl border border-green-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              Pendaftaran Diterima
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              Data kamu sudah masuk ke dashboard admin Meta Peptides. Tim kami
              akan review dan menghubungi WhatsApp yang kamu isi.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Nama Lengkap
                </span>
                <input
                  value={form.full_name}
                  onChange={(e) => updateForm("full_name", e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Email
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Nomor WhatsApp
                </span>
                <input
                  value={form.whatsapp_number}
                  onChange={(e) => updateForm("whatsapp_number", e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Nama Bisnis
                </span>
                <input
                  value={form.business_name}
                  onChange={(e) => updateForm("business_name", e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Tipe Bisnis
                </span>
                <select
                  value={form.business_type}
                  onChange={(e) => updateForm("business_type", e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent"
                >
                  <option value="">Pilih tipe bisnis</option>
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Kota
                </span>
                <input
                  value={form.city}
                  onChange={(e) => updateForm("city", e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Negara
                </span>
                <input
                  value={form.country}
                  onChange={(e) => updateForm("country", e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Estimasi Order / Bulan
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.estimated_monthly_orders}
                  onChange={(e) =>
                    updateForm("estimated_monthly_orders", e.target.value)
                  }
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent"
                  placeholder="Optional"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Link Store / Social Media
                </span>
                <input
                  value={form.social_link}
                  onChange={(e) => updateForm("social_link", e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent"
                  placeholder="Instagram, website, marketplace, or community link"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Catatan
                </span>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  className="min-h-32 w-full resize-none rounded-3xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent"
                  placeholder="Ceritakan channel penjualan, audience, atau kebutuhan reseller kamu."
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent/90 disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              Submit Reseller Form
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
