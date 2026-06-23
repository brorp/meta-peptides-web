"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Loader2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

const WHATSAPP_NUMBER = "6285191378473";

const AGE_OPTIONS = [
  { label: "21 - 35 years", value: "21-35" },
  { label: "36 - 55 years", value: "36-55" },
  { label: "Above 55 years", value: "55+" },
  { label: "Rather not say", value: "undisclosed" },
];

const GENDER_OPTIONS = ["Male", "Female"];

const DOMICILE_OPTIONS = [
  "Jabodetabek",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Sumatera",
  "Kalimantan",
  "Sulawesi",
  "Bali & Nusa Tenggara",
  "Maluku & Papua",
];

const INITIAL_FORM = {
  name: "",
  whatsapp: "",
  age: "",
  gender: "",
  email: "",
  domicile: "",
  goals: "",
  concern: "",
  website: "",
};

type FormField = keyof typeof INITIAL_FORM;

function getErrorMessage(error: any) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Please review your details and try again."
  );
}

export function FreeConsultationForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [categories, setCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    axios
      .get<any>("/categories")
      .then(({ data }) => {
        if (data?.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const updateForm = (field: FormField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<FormField, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required";
    if (!form.whatsapp.trim()) {
      nextErrors.whatsapp = "WhatsApp number is required";
    }
    if (!form.age) nextErrors.age = "Select your age range";
    if (!form.gender) nextErrors.gender = "Select your gender";
    if (!form.domicile) nextErrors.domicile = "Select your domicile";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const query = new URLSearchParams(window.location.search);
      await axios.post("/consultations", {
        ...form,
        utm_source: query.get("utm_source") || "",
        utm_medium: query.get("utm_medium") || "",
        utm_campaign: query.get("utm_campaign") || "",
        utm_content: query.get("utm_content") || "",
        utm_term: query.get("utm_term") || "",
      });

      const date = new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date());
      const ageLabel =
        AGE_OPTIONS.find((option) => option.value === form.age)?.label || form.age;
      const message = [
        `Halo Kak, saya sudah mengisi form Free Consultation pada ${date}.`,
        "",
        `Nama: ${form.name.trim()}`,
        `No. WhatsApp: ${form.whatsapp.trim()}`,
        `Usia: ${ageLabel}`,
        `Gender: ${form.gender}`,
        form.email.trim() ? `Email: ${form.email.trim()}` : null,
        `Domisili: ${form.domicile}`,
        form.goals ? `Goals: ${form.goals}` : null,
        form.concern.trim() ? `Concern: ${form.concern.trim()}` : null,
        "",
        "Mohon dibantu untuk konsultasinya. Terima kasih.",
      ]
        .filter((line) => line !== null)
        .join("\n");

      window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        message,
      )}`;
    } catch (error: any) {
      toast.error("Could not submit your consultation", {
        description: getErrorMessage(error),
      });
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10";
  const labelClass =
    "mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500";

  return (
    <div className="min-h-screen overflow-hidden bg-[#f3f4ef] pt-28 text-slate-900 md:pt-32">
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] [background-image:radial-gradient(#111_1px,transparent_1px)] [background-size:22px_22px]" />

      <main className="relative mx-auto grid max-w-7xl gap-8 px-5 pb-16 md:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start lg:gap-12">
        <section className="py-6 lg:sticky lg:top-32 lg:py-10">
          <div className="mb-8 flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="MetaPeptides"
              width={56}
              height={56}
              className="h-12 w-auto object-contain"
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent">
                MetaPeptides
              </p>
              <p className="text-xs font-bold text-slate-500">
                Personal consultation
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Free Consultation
          </div>
          <h1 className="mt-6 max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.045em] md:text-6xl">
            Your goals first.
            <span className="mt-2 block font-light italic text-slate-400">
              The right journey follows.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-sm font-medium leading-7 text-slate-600 md:text-base">
            Complete this short form so our team can understand your goals before
            continuing the conversation on WhatsApp.
          </p>

          <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              [ShieldCheck, "Private", "Your details stay confidential"],
              [BadgeCheck, "Focused", "Guidance based on your goals"],
              [MessageCircle, "Direct", "Continue instantly on WhatsApp"],
            ].map(([Icon, title, description]) => {
              const FeatureIcon = Icon as typeof ShieldCheck;
              return (
                <div
                  key={String(title)}
                  className="rounded-2xl border border-black/5 bg-white/65 p-4 backdrop-blur"
                >
                  <FeatureIcon className="mb-3 h-4 w-4 text-accent" />
                  <p className="text-xs font-black uppercase tracking-wider">
                    {String(title)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    {String(description)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.10)] md:p-8">
          <div className="mb-7 flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                Step 1 of 1
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Tell us about yourself
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-400">
                Required fields are marked with an asterisk.
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(event) => updateForm("website", event.target.value)}
              className="hidden"
              aria-hidden="true"
            />

            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <span className={labelClass}>Full Name *</span>
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Your full name"
                  className={inputClass}
                />
                {errors.name && (
                  <span className="mt-1.5 block text-[10px] font-bold text-red-500">
                    {errors.name}
                  </span>
                )}
              </label>

              <label>
                <span className={labelClass}>WhatsApp Number *</span>
                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(event) => updateForm("whatsapp", event.target.value)}
                  placeholder="e.g. 08123456789"
                  className={inputClass}
                />
                {errors.whatsapp && (
                  <span className="mt-1.5 block text-[10px] font-bold text-red-500">
                    {errors.whatsapp}
                  </span>
                )}
              </label>

              <label>
                <span className={labelClass}>Age Range *</span>
                <select
                  value={form.age}
                  onChange={(event) => updateForm("age", event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select age range</option>
                  {AGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.age && (
                  <span className="mt-1.5 block text-[10px] font-bold text-red-500">
                    {errors.age}
                  </span>
                )}
              </label>

              <fieldset>
                <legend className={labelClass}>Gender *</legend>
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => updateForm("gender", gender)}
                      className={`h-12 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                        form.gender === gender
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:border-accent/40 hover:text-accent"
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
                {errors.gender && (
                  <span className="mt-1.5 block text-[10px] font-bold text-red-500">
                    {errors.gender}
                  </span>
                )}
              </fieldset>

              <label>
                <span className={labelClass}>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                />
                {errors.email && (
                  <span className="mt-1.5 block text-[10px] font-bold text-red-500">
                    {errors.email}
                  </span>
                )}
              </label>

              <label>
                <span className={labelClass}>Domicile *</span>
                <select
                  value={form.domicile}
                  onChange={(event) => updateForm("domicile", event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select domicile</option>
                  {DOMICILE_OPTIONS.map((domicile) => (
                    <option key={domicile} value={domicile}>
                      {domicile}
                    </option>
                  ))}
                </select>
                {errors.domicile && (
                  <span className="mt-1.5 block text-[10px] font-bold text-red-500">
                    {errors.domicile}
                  </span>
                )}
              </label>
            </div>

            {categories.length > 0 && (
              <label className="block">
                <span className={labelClass}>Primary Goal</span>
                <select
                  value={form.goals}
                  onChange={(event) => updateForm("goals", event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select your goal (optional)</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className={labelClass}>Your Concern or Question</span>
              <textarea
                value={form.concern}
                onChange={(event) => updateForm("concern", event.target.value)}
                placeholder="Tell us what you want to discuss..."
                rows={4}
                className={`${inputClass} h-auto resize-none py-3`}
              />
            </label>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-[11px] font-medium leading-5 text-slate-500">
                  By continuing, your details will be recorded for consultation
                  follow-up and included in your pre-filled WhatsApp message.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="group flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 px-6 text-xs font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-slate-200 transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing WhatsApp
                </>
              ) : (
                <>
                  Continue to WhatsApp
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              No consultation fee
              <span className="text-slate-200">•</span>
              Direct WhatsApp follow-up
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
