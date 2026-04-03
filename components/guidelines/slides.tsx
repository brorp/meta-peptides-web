import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

// ─────────────────────────────────────────────
// Slide 1 — Cover
// ─────────────────────────────────────────────
export function SlideCover() {
  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#414042] overflow-hidden select-none">
      {/* Background glow */}
      <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-emerald-400/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-[260px] h-[260px] rounded-full bg-emerald-400/10 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-8">
        <Image src="/logo.webp" alt="MetaPeptides" width={36} height={36} className="rounded-lg opacity-90" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Research Manual</span>
      </div>

      {/* Main content */}
      <div className="relative z-10 px-6 pb-0 flex-1 flex flex-col justify-center gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400">MetaPeptides</p>
          <h1 className="text-5xl sm:text-6xl font-black uppercase italic tracking-tighter text-white leading-[0.85]">
            Peptides<br />
            <span className="text-emerald-400">Guide.</span>
          </h1>
        </div>
        <p className="text-sm text-white/60 font-medium leading-relaxed max-w-xs">
          Everything you need to know about handling, application and storage —
          written in Bahasa Indonesia for your research journey.
        </p>

        {/* Step pills */}
        <div className="flex flex-wrap gap-2">
          {["Sanitization", "Concentration", "Reconstitution", "Dosing", "Application", "Storage"].map((s, i) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-wider text-white/70"
            >
              <span className="text-emerald-400">0{i + 1}</span>{s}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 px-6 pb-8 pt-6 border-t border-white/10 flex items-center justify-between">
        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Swipe to begin →</p>
        <div className="w-8 h-8 rounded-full border border-emerald-400/40 flex items-center justify-center">
          <ArrowRight size={14} className="text-emerald-400" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 2 — Package Contents
// ─────────────────────────────────────────────
export function SlidePackage() {
  const items = [
    { qty: "", name: "Lyophilized Peptide", desc: "Powder form, steril", emoji: "🧪" },
    { qty: "", name: "Bacteriostatic Water", desc: "BAC Water untuk reconstitution", emoji: "💧" },
    { qty: "", name: "Alcohol Swab", desc: "Sanitization protocol", emoji: "🧴" },
    { qty: "", name: "Syringe 3mL / 10 mL", desc: "Untuk reconstitution", emoji: "💉" },
    { qty: "", name: "Syringe 0.5mL", desc: "Precise dosing", emoji: "🔬" },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      {/* Section header */}
      <div className="bg-slate-900 px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">Section 1</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">
          What You'll Get in <span className="text-emerald-400">Every Package</span>
        </h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">
          Essential tools to handle and prepare your research peptides.
        </p>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto px-5 py-5 space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shrink-0 shadow-sm">
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-900">{item.qty} — {item.name}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}

        {/* Note */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3 items-start">
          <span className="text-amber-500 text-base shrink-0">⚠️</span>
          <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
            <span className="font-black">Note:</span> Contents may vary depending on product type or availability.
            If any item differs, it will be clearly stated during checkout or confirmed by support.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 3 — Overview
// ─────────────────────────────────────────────
export function SlideOverview() {
  const steps = ["Sanitization", "Deciding Concentration", "Reconstitution", "Dosing", "Application", "Storage"];

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-slate-900 px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">Section 2</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">
          The Big Picture <span className="text-emerald-400">Overview</span>
        </h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">
          Proper peptide application is easy and simple — must be done in correct order.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        {/* Step pills */}
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100"
            >
              <span className="text-[13px] font-black text-emerald-500 w-6 shrink-0">0{i + 1}</span>
              <span className="text-[12px] font-black uppercase tracking-wide text-slate-800">{step}</span>
            </div>
          ))}
        </div>

        {/* Video CTA */}
        <a
          href="https://drive.google.com/file/d/1UweOzfVrftzw7_SDMZupCTmgiS3zsFpU/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 active:bg-emerald-100 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <span className="text-white text-base ml-0.5">▶</span>
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-wide text-emerald-700">Watch Protocol Video</p>
            <p className="text-[10px] text-emerald-600/70 font-medium">Full walkthrough</p>
          </div>
          <ExternalLink size={14} className="text-emerald-400 ml-auto shrink-0" />
        </a>

        <p className="text-[10px] text-slate-400 leading-relaxed font-medium italic text-center">
          Please read all steps carefully — each affects accuracy & stability
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 4 — Step 1: Sanitization
// ─────────────────────────────────────────────
export function SlideSanitization() {
  const checklist = [
    "Cuci tangan dengan bersih sebelum memulai",
    "Gunakan alcohol swab untuk membersihkan tutup vial",
    "Siapkan di permukaan yang bersih dan kering",
    "Gunakan syringe baru (jangan pernah reuse)",
    "Hindari menyentuh ujung jarum atau bagian dalam tutup vial",
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">Step 1</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Sanitization</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">
          Sebelum menangani vial, syringe, atau larutan apa pun — pastikan area kerja bersih.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
            Kenapa ini penting
          </p>
          <p className="text-[13px] text-slate-700 font-medium leading-relaxed">
            Peptides umumnya dipersiapkan dengan standar steril. Kontaminasi dapat memengaruhi
            stabilitas dan menimbulkan <strong>unwanted variable</strong> dalam proses penelitian.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
            Checklist Sanitasi ✓
          </p>
          {checklist.map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[12px] font-bold text-slate-700 leading-snug">{item}</p>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex gap-2 items-start">
          <span className="shrink-0 text-sm">📌</span>
          <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-wide">
            Catatan: Selalu bersihkan karet penutup vial dengan alc swab sebelum jarum dimasukkan.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 5 — Step 2: Concentration
// ─────────────────────────────────────────────
export function SlideConcentration() {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">Step 2</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Deciding Concentration</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">
          Tentukan konsentrasi sebelum mencampur untuk dosing yang lebih mudah & akurat.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center">
            <p className="text-lg mb-1">😵</p>
            <p className="text-[10px] font-black uppercase text-red-600">Terlalu Pekat</p>
            <p className="text-[9px] text-red-500/70 mt-0.5 font-medium">Sulit micro-dosing</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
            <p className="text-lg mb-1">💦</p>
            <p className="text-[10px] font-black uppercase text-blue-600">Terlalu Encer</p>
            <p className="text-[9px] text-blue-500/70 mt-0.5 font-medium">Volume injeksi terlalu besar</p>
          </div>
        </div>

        {/* Example box */}
        <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
            Contoh (Vial 10mg Retatrutide)
          </p>
          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-800">
            <span>10mg</span>
            <span className="text-slate-400">+</span>
            <span>2mL BAC Water</span>
            <span className="text-slate-400">=</span>
            <span className="text-emerald-600 font-black">5mg/mL</span>
          </div>
          <div className="border-t border-emerald-100 pt-3 space-y-1.5">
            {[
              ["0.5mg", "0.1mL"],
              ["1mg", "0.2mL"],
              ["2mg", "0.4mL"],
            ].map(([dose, vol]) => (
              <div key={dose} className="flex items-center justify-between text-[12px] font-bold text-slate-700">
                <span>Apply <span className="text-emerald-600">{dose}</span></span>
                <span className="text-slate-400">→</span>
                <span>butuh <span className="font-black text-slate-900">{vol}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            💡 <strong>Don't worry</strong> — setiap produk yang kamu beli sudah disertai rekomendasi konsentrasi
            dan dosing guidelines.
          </p>
        </div>

        <Link
          href="/peptide-guides"
          className="flex items-center gap-2 text-[11px] font-black text-emerald-600 uppercase tracking-wide hover:underline"
        >
          Click here to learn more <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 6 — Step 3: Reconstitution
// ─────────────────────────────────────────────
export function SlideReconstitution() {
  const steps = [
    "Gunakan syringe 3mL untuk mengambil BAC water sesuai volume",
    "Masukkan jarum ke dalam vial peptide",
    "Suntikkan BAC water secara perlahan melalui dinding bagian dalam vial",
    "Biarkan powder larut secara natural",
    "Putar perlahan vial (swirl) — jangan dikocok keras",
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">Step 3</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Reconstitution</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">Pencampuran — melarutkan powder menggunakan BAC water.</p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-[12px] font-bold text-slate-700 leading-snug">{step}</p>
          </div>
        ))}

        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
          {[
            ["❌", "Jangan tuang bacwater terlalu cepat (foam/bubble)"],
            ["❌", "Jangan shake secara agresif"],
            ["✅", "Diamkan 5–10 menit agar larutan stabil (larutan harus terlihat bening transparan)"],
            ["⚠️", "Jika larutan keruh/cloudy atau ada bubuk yang tidak larut sempurna, jangan digunakan"]
          ].map(([icon, text]) => (
            <div key={text} className="flex gap-2 px-4 py-2.5 items-center">
              <span className="text-sm shrink-0">{icon}</span>
              <p className="text-[11px] font-bold text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 7 — Step 4: Dosing
// ─────────────────────────────────────────────
export function SlideDosing() {
  const checklist = [
    "Pastikan konsentrasi sudah benar sebelum menarik larutan",
    "Gunakan syringe baru dan steril",
    "Tarik larutan secara perlahan untuk menghindari air bubble",
    "Pastikan angka pada syringe sesuai dengan dosis yang diinginkan",
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">Step 4</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Dosing</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">
          Proses dosing berdasarkan konsentrasi yang sudah kamu buat.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Dosing Checklist</p>
          {checklist.map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[12px] font-bold text-slate-700 leading-snug">{item}</p>
            </div>
          ))}
        </div>

        <a
          href="https://particlepeptides.com/en/content/48-peptide-calculator"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 text-white active:bg-slate-800 transition-colors"
        >
          <div>
            <p className="text-[12px] font-black uppercase tracking-wide">Peptide Calculator</p>
            <p className="text-[10px] text-white/50 font-medium mt-0.5">Untuk perhitungan lebih akurat</p>
          </div>
          <ExternalLink size={16} className="text-emerald-400 shrink-0" />
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 8 — Step 5: Application
// ─────────────────────────────────────────────
export function SlideApplication() {
  const steps = [
    "Bersihkan area injeksi dengan alcohol swab",
    "Gunakan syringe baru",
    "Pastikan volume dosis sesuai perhitungan",
    "Aplikasikan pada area yang ditentukan",
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">Step 5</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Application</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">
          Area abdomen adalah yang paling umum — paling mudah dan visible.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        {/* Injection site image */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://ik.imagekit.io/fjaskqdnu0xp/ChatGPT%20Image%2023%20Mar%202026,%2020.22.36_g3-XbeHc7.png"
            alt="Injection site diagram"
            className="w-full object-contain max-h-44"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-3 py-2">
            <p className="text-[9px] text-white/80 font-bold uppercase tracking-widest">Injection Site Reference</p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Cara Aplikasi</p>
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[12px] font-bold text-slate-700 leading-snug">{step}</p>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex gap-2 items-center">
          <span className="text-base shrink-0">🚨</span>
          <p className="text-[10px] font-black text-red-600 uppercase tracking-wide">
            Safety Reminder: Jangan pernah menggunakan syringe yang sama lebih dari satu kali.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 9 — Step 6: Storage
// ─────────────────────────────────────────────
export function SlideStorage() {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">Step 6</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Storage</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">
          Penyimpanan yang benar menjaga stabilitas dan konsistensi peptide kamu.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        {/* Before reconstitution */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-4 py-3 flex items-center gap-2">
            <span className="text-base">📦</span>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-700">
              Sebelum Reconstitution — Powder Form
            </p>
          </div>
          <div className="p-4 space-y-2">
            {[
              "Simpan di tempat sejuk dan kering",
              "Hindari paparan cahaya langsung",
              "Hindari area lembap atau panas",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* After reconstitution */}
        <div className="rounded-2xl border border-blue-200 overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 flex items-center gap-2">
            <span className="text-base">🧊</span>
            <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">
              Setelah Reconstitution — Liquid Form
            </p>
          </div>
          <div className="p-4 space-y-2">
            {[
              "Simpan di kulkas suhu 2°C – 4°C",
              "Pastikan vial tertutup rapat saat tidak digunakan",
              "Simpan di pojok kulkas — suhu lebih stabil",
              "Hindari guncangan & perubahan suhu berulang",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-blue-700">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 10 — Closing
// ─────────────────────────────────────────────
export function SlideClosing() {
  const mistakes = [
    "Shaking the vial aggressively",
    "Injecting BAC water too quickly",
    "Touching needle tips",
    "Not sanitizing vial tops",
    "Using incorrect concentration calculations",
    "Storing peptides at unstable temperatures",
    "Reusing syringes",
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">All Done!</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">
          You're <span className="text-emerald-400">All Set.</span>
        </h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">
          Congrats — now you fully understand how to apply your peptides.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        {/* Common mistakes */}
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center gap-1.5">
            ⚠️ Common Mistakes to Avoid
          </p>
          <div className="space-y-1.5">
            {mistakes.map((err, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-red-500/80 uppercase tracking-wide">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {err}
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Disclaimer</p>
          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
            All products sold on this website are strictly intended for laboratory and research purposes only.
            They are not intended for human consumption, medical use, diagnosis, treatment, or prevention of disease.
            The buyer assumes full responsibility for handling, storage, and usage.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/shop"
          className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-[0.15em] text-[13px] shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform"
        >
          Go to Shop <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
