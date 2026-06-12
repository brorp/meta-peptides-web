"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, Sparkles, Loader2, User, Phone, Mail, MapPin, Target, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api as axios } from "@/lib/axios";

// ─── Constants ──────────────────────────────────────────────────────────────

const WHATSAPP_NUMBER = "85191378473"; // MetaPeptides WA number

const AGE_OPTIONS = [
  { label: "> 21 – 35 years", value: "21-35" },
  { label: "> 35 – 55 years", value: "35-55" },
  { label: "> 55 years", value: "55+" },
  { label: "Rather not say", value: "undisclosed" },
];

const GENDER_OPTIONS = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
];

const DOMICILI_OPTIONS = [
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConsultationFormData {
  name: string;
  whatsapp: string;
  age: string;
  gender: string;
  email: string;
  domicile: string;
  goals: string;
  concern: string;
}

interface ConsultationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function FieldLabel({
  children,
  required,
  icon,
}: {
  children: React.ReactNode;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
      {icon && <span className="text-accent">{icon}</span>}
      {children}
      {required && <span className="text-accent">*</span>}
    </label>
  );
}

function StyledInput({
  placeholder,
  value,
  onChange,
  type = "text",
  error,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-11 bg-slate-50 border ${error ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-accent focus:ring-accent/10"} rounded-xl px-4 text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:ring-4 transition-all`}
      />
      {error && <p className="mt-1 text-[10px] text-red-500 font-semibold">{error}</p>}
    </div>
  );
}

function StyledSelect({
  placeholder,
  value,
  onChange,
  options,
  error,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  error?: string;
}) {
  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-11 bg-slate-50 border ${error ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-accent focus:ring-accent/10"} rounded-xl px-4 text-sm font-medium text-slate-800 outline-none focus:ring-4 transition-all appearance-none cursor-pointer ${!value ? "text-slate-300" : "text-slate-800"}`}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-[10px] text-red-500 font-semibold">{error}</p>}
    </div>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
  error,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`h-10 px-5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
              value === opt.value
                ? "bg-[#414042] text-white border-[#414042] shadow-md"
                : "bg-slate-50 text-slate-500 border-slate-200 hover:border-accent/50 hover:text-accent"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-[10px] text-red-500 font-semibold">{error}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConsultationModal({ open, onOpenChange }: ConsultationModalProps) {
  const [form, setForm] = useState<ConsultationFormData>({
    name: "",
    whatsapp: "",
    age: "",
    gender: "",
    email: "",
    domicile: "",
    goals: "",
    concern: "",
  });
  const [errors, setErrors] = useState<Partial<ConsultationFormData>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories from API
  useEffect(() => {
    if (!open) return;
    axios
      .get<any>("/categories")
      .then(({ data }) => {
        if (data?.success && Array.isArray(data.data)) {
          setCategories(data.data as string[]);
        }
      })
      .catch(() => {});
  }, [open]);

  const set = (field: keyof ConsultationFormData) => (v: string) => {
    setForm((prev) => ({ ...prev, [field]: v }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<ConsultationFormData> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.whatsapp.trim()) newErrors.whatsapp = "WhatsApp number is required";
    if (!form.age) newErrors.age = "Please select your age range";
    if (!form.gender) newErrors.gender = "Please select your gender";
    if (!form.domicile) newErrors.domicile = "Domicile is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    // Save to Customers DB (best-effort, non-blocking for UX)
    try {
      await axios.post("/admin/customers", {
        full_name: form.name.trim(),
        whatsapp_phone: form.whatsapp.trim(),
        email: form.email.trim() || null,
        domicile: form.domicile,
        notes: [
          `Age: ${form.age}`,
          `Gender: ${form.gender}`,
          form.goals ? `Goals: ${form.goals}` : null,
          form.concern ? `Concern: ${form.concern}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
        lead_source: "manual",
        current_journey: "new_leads",
      });
    } catch {
      // Silently continue — the WA link is the main flow
    }

    // Build WhatsApp message
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const lines = [
      `Halo Kak, saya sudah isi form konsultasi pada tanggal ${dateStr}`,
      ``,
      `Nama        : ${form.name}`,
      `No WhatsApp : ${form.whatsapp}`,
      `Usia        : ${AGE_OPTIONS.find((a) => a.value === form.age)?.label ?? form.age}`,
      `Gender      : ${form.gender}`,
      form.email ? `Email       : ${form.email}` : null,
      `Domisili    : ${form.domicile}`,
      form.goals ? `Goals       : ${form.goals}` : null,
      form.concern ? `Concern     : ${form.concern}` : null,
      ``,
      `Terimakasih 🙏`,
    ]
      .filter((l) => l !== null)
      .join("\n");

    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`;

    setIsSubmitting(false);
    onOpenChange(false);

    // Reset form after close
    setTimeout(() => {
      setForm({ name: "", whatsapp: "", age: "", gender: "", email: "", domicile: "", goals: "", concern: "" });
      setErrors({});
    }, 400);

    window.open(waUrl, "_blank");
  };

  const goalOptions = categories.map((c) => ({ label: c, value: c }));
  const domicileOptions = DOMICILI_OPTIONS.map((d) => ({ label: d, value: d }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        isIconClose={false}
        className="z-[100] w-[95vw] sm:max-w-[540px] p-0 overflow-hidden border-none bg-transparent shadow-none outline-none max-h-[95vh]"
      >
        <DialogTitle className="sr-only">Free Consultation – MetaPeptides</DialogTitle>

        <div className="relative bg-white rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden flex flex-col max-h-[95vh]">
          {/* ── Gradient Header ── */}
          <div className="relative bg-[#414042] px-6 pt-7 pb-8 flex-shrink-0">
            {/* Glow blobs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl -ml-8 pointer-events-none" />

            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon + Title */}
            <div className="relative flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-accent/20 rounded-xl border border-accent/30">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-[9px] font-black text-accent uppercase tracking-[0.3em]">MetaPeptides</p>
                <h2 className="text-xl font-black text-white tracking-tighter leading-none">
                  Free Consultation
                </h2>
              </div>
            </div>
            <p className="relative text-white/50 text-xs font-medium leading-relaxed">
              Tell us about yourself and we'll guide you to the right peptide journey.
            </p>
          </div>

          {/* ── Form Body ── */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {/* Name */}
            <div>
              <FieldLabel required icon={<User className="w-3 h-3" />}>
                Full Name
              </FieldLabel>
              <StyledInput
                placeholder="Enter your full name"
                value={form.name}
                onChange={set("name")}
                error={errors.name}
              />
            </div>

            {/* WhatsApp */}
            <div>
              <FieldLabel required icon={<Phone className="w-3 h-3" />}>
                WhatsApp Number
              </FieldLabel>
              <StyledInput
                placeholder="e.g. 628123456789"
                value={form.whatsapp}
                onChange={set("whatsapp")}
                type="tel"
                error={errors.whatsapp}
              />
            </div>

            {/* Age + Gender row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Age Range</FieldLabel>
                <StyledSelect
                  placeholder="Select age range"
                  value={form.age}
                  onChange={set("age")}
                  options={AGE_OPTIONS}
                  error={errors.age}
                />
              </div>
              <div>
                <FieldLabel required>Gender</FieldLabel>
                <RadioGroup
                  options={GENDER_OPTIONS}
                  value={form.gender}
                  onChange={set("gender")}
                  error={errors.gender}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <FieldLabel icon={<Mail className="w-3 h-3" />}>Email</FieldLabel>
              <StyledInput
                placeholder="your@email.com (optional)"
                value={form.email}
                onChange={set("email")}
                type="email"
                error={errors.email}
              />
            </div>

            {/* Domicile */}
            <div>
              <FieldLabel required icon={<MapPin className="w-3 h-3" />}>
                Domicile
              </FieldLabel>
              <StyledSelect
                placeholder="Select your domicile"
                value={form.domicile}
                onChange={set("domicile")}
                options={domicileOptions}
                error={errors.domicile}
              />
            </div>

            {/* Goals */}
            {goalOptions.length > 0 && (
              <div>
                <FieldLabel icon={<Target className="w-3 h-3" />}>Goals</FieldLabel>
                <StyledSelect
                  placeholder="What is your primary goal? (optional)"
                  value={form.goals}
                  onChange={set("goals")}
                  options={goalOptions}
                />
              </div>
            )}

            {/* Concern */}
            <div>
              <FieldLabel icon={<MessageSquare className="w-3 h-3" />}>Tell us your concern</FieldLabel>
              <textarea
                placeholder="Share any specific concerns or questions you have... (optional)"
                value={form.concern}
                onChange={(e) => set("concern")(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 focus:border-accent focus:ring-4 focus:ring-accent/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* ── Footer CTA ── */}
          <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-slate-100">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-13 py-3.5 rounded-xl bg-[#414042] hover:bg-accent text-white font-black uppercase tracking-widest text-[11px] transition-all duration-300 shadow-xl shadow-slate-200 group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  Start your Journey
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
            <p className="text-center text-[10px] text-slate-400 font-medium mt-3">
              You'll be redirected to WhatsApp with your details pre-filled 💬
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
