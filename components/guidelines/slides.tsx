import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { Lang } from "./translations";
import { t } from "./translations";

// ─────────────────────────────────────────────
// Slide 1 — Cover
// ─────────────────────────────────────────────
interface SlideCoverProps {
  lang: Lang;
  onLangChange: (l: Lang) => void;
}

export function SlideCover({ lang, onLangChange }: SlideCoverProps) {
  const c = t.cover;
  const steps = lang === "ID"
    ? ["Sanitasi", "Konsentrasi", "Reconstitution", "Dosing", "Aplikasi", "Penyimpanan"]
    : ["Sanitization", "Concentration", "Reconstitution", "Dosing", "Application", "Storage"];

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#414042] overflow-hidden select-none">
      {/* Background glow */}
      <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-emerald-400/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-[260px] h-[260px] rounded-full bg-emerald-400/10 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-8">
        <Image src="/logo.webp" alt="MetaPeptides" width={36} height={36} className="rounded-lg opacity-90" />
        <div className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-full p-1">
          {(["ID", "EN"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => onLangChange(l)}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                lang === l
                  ? "bg-emerald-500 text-white shadow"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
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
          {c.subtitle[lang]}
        </p>

        {/* Step pills */}
        <div className="flex flex-wrap gap-2">
          {steps.map((s, i) => (
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
        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{c.swipeToBegin[lang]}</p>
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
export function SlidePackage({ lang }: { lang: Lang }) {
  const c = t.package;
  const items = c.items[lang];

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      {/* Section header */}
      <div className="bg-slate-900 px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">{c.section[lang]}</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">
          {c.title[lang]} <span className="text-emerald-400">{c.titleHighlight[lang]}</span>
        </h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">{c.subtitle[lang]}</p>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto px-5 py-5 space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shrink-0 shadow-sm">
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-900">— {item.name}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}

        {/* Note */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3 items-start">
          <span className="text-amber-500 text-base shrink-0">⚠️</span>
          <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
            <span className="font-black">{c.noteLabel[lang]}</span> {c.noteText[lang]}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 3 — Overview
// ─────────────────────────────────────────────
export function SlideOverview({ lang }: { lang: Lang }) {
  const c = t.overview;

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-slate-900 px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">{c.section[lang]}</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">
          {c.title[lang]} <span className="text-emerald-400">{c.titleHighlight[lang]}</span>
        </h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        {/* Step pills */}
        <div className="space-y-2">
          {c.steps[lang].map((step, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
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
            <p className="text-[12px] font-black uppercase tracking-wide text-emerald-700">{c.watchLabel[lang]}</p>
            <p className="text-[10px] text-emerald-600/70 font-medium">{c.watchSub[lang]}</p>
          </div>
          <ExternalLink size={14} className="text-emerald-400 ml-auto shrink-0" />
        </a>

        <p className="text-[10px] text-slate-400 leading-relaxed font-medium italic text-center">
          {c.readAll[lang]}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 4 — Step 1: Sanitization
// ─────────────────────────────────────────────
export function SlideSanitization({ lang }: { lang: Lang }) {
  const c = t.sanitization;

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">{c.step[lang]}</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{c.title[lang]}</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">{c.whyLabel[lang]}</p>
          <p className="text-[13px] text-slate-700 font-medium leading-relaxed">
            {c.whyText[lang]}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">{c.checklistLabel[lang]}</p>
          {c.checklist[lang].map((item, i) => (
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
            {c.note[lang]}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 5 — Step 2: Concentration
// ─────────────────────────────────────────────
export function SlideConcentration({ lang }: { lang: Lang }) {
  const c = t.concentration;

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">{c.step[lang]}</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{c.title[lang]}</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center">
            <p className="text-lg mb-1">😵</p>
            <p className="text-[10px] font-black uppercase text-red-600">{c.tooPekat[lang]}</p>
            <p className="text-[9px] text-red-500/70 mt-0.5 font-medium">{c.tooPekatSub[lang]}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
            <p className="text-lg mb-1">💦</p>
            <p className="text-[10px] font-black uppercase text-blue-600">{c.tooEncer[lang]}</p>
            <p className="text-[9px] text-blue-500/70 mt-0.5 font-medium">{c.tooEncerSub[lang]}</p>
          </div>
        </div>

        {/* Example box */}
        <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{c.exampleLabel[lang]}</p>
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
                <span>{c.applyLabel[lang]} <span className="text-emerald-600">{dose}</span></span>
                <span className="text-slate-400">→</span>
                <span>{c.needLabel[lang]} <span className="font-black text-slate-900">{vol}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            💡 <strong>Don&apos;t worry</strong> — {c.tipText[lang]}
          </p>
        </div>

        <Link
          href="/peptide-guides"
          className="flex items-center gap-2 text-[11px] font-black text-emerald-600 uppercase tracking-wide hover:underline"
        >
          {c.learnMore[lang]} <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 6 — Step 3: Reconstitution
// ─────────────────────────────────────────────
export function SlideReconstitution({ lang }: { lang: Lang }) {
  const c = t.reconstitution;

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">{c.step[lang]}</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{c.title[lang]}</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-3">
        {c.steps[lang].map((step, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-[12px] font-bold text-slate-700 leading-snug">{step}</p>
          </div>
        ))}

        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
          {c.dos[lang].map(([icon, text]) => (
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
export function SlideDosing({ lang }: { lang: Lang }) {
  const c = t.dosing;

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">{c.step[lang]}</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{c.title[lang]}</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">{c.checklistLabel[lang]}</p>
          {c.checklist[lang].map((item, i) => (
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
            <p className="text-[12px] font-black uppercase tracking-wide">{c.calculatorLabel[lang]}</p>
            <p className="text-[10px] text-white/50 font-medium mt-0.5">{c.calculatorSub[lang]}</p>
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
export function SlideApplication({ lang }: { lang: Lang }) {
  const c = t.application;

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">{c.step[lang]}</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{c.title[lang]}</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">{c.subtitle[lang]}</p>
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
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">{c.stepsLabel[lang]}</p>
          {c.steps[lang].map((step, i) => (
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
          <p className="text-[10px] font-black text-red-600 uppercase tracking-wide">{c.safetyReminder[lang]}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Slide 9 — Step 6: Storage
// ─────────────────────────────────────────────
export function SlideStorage({ lang }: { lang: Lang }) {
  const c = t.storage;

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">{c.step[lang]}</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{c.title[lang]}</h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        {/* Before reconstitution */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-4 py-3 flex items-center gap-2">
            <span className="text-base">📦</span>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-700">{c.beforeLabel[lang]}</p>
          </div>
          <div className="p-4 space-y-2">
            {c.beforeItems[lang].map((item, i) => (
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
            <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">{c.afterLabel[lang]}</p>
          </div>
          <div className="p-4 space-y-2">
            {c.afterItems[lang].map((item, i) => (
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
export function SlideClosing({ lang }: { lang: Lang }) {
  const c = t.closing;

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <div className="bg-[#414042] px-6 py-5 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-1">{c.sectionLabel[lang]}</p>
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">
          {c.title[lang]} <span className="text-emerald-400">{c.titleHighlight[lang]}</span>
        </h2>
        <p className="text-[11px] text-white/50 mt-1 font-medium">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        {/* Common mistakes */}
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center gap-1.5">
            {c.mistakesLabel[lang]}
          </p>
          <div className="space-y-1.5">
            {c.mistakes[lang].map((err, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-red-500/80 uppercase tracking-wide">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {err}
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">{c.disclaimerLabel[lang]}</p>
          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{c.disclaimerText[lang]}</p>
        </div>

        {/* CTA */}
        <Link
          href="/shop"
          className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-[0.15em] text-[13px] shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform"
        >
          {c.goToShop[lang]} <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
