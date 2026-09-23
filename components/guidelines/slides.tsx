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
}

export function SlideCover({ lang }: SlideCoverProps) {
  const c = t.cover;
  const steps = lang === "ID"
    ? ["Sanitasi", "Konsentrasi", "Reconstitution", "Dosing", "Aplikasi", "Penyimpanan"]
    : ["Sanitization", "Concentration", "Reconstitution", "Dosing", "Application", "Storage"];

  return (
    <div className="relative flex h-full w-full select-none flex-col justify-between overflow-hidden bg-[#414042]">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/[0.08] blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#bcb8b1]/10 blur-[90px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-8 sm:px-10 sm:pt-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white">
            <Image src="/icon-meta.png" alt="MetaPeptides" width={44} height={44} className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Research essentials</p>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-white">MetaPeptides</p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">01 / 10</span>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 flex-col justify-center gap-7 px-6 pb-0 sm:px-10">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#c9c5bd]">Practical Reference</p>
          <h1 className="text-5xl font-black uppercase tracking-[-0.055em] text-white sm:text-7xl sm:leading-[0.82]">
            Peptides<br />
            <span className="text-[#c9c5bd]">Guide.</span>
          </h1>
        </div>
        <p className="max-w-md text-sm font-medium leading-relaxed text-white/60 sm:text-base">
          {c.subtitle[lang]}
        </p>

        {/* Step pills */}
        <div className="flex max-w-2xl flex-wrap gap-2">
          {steps.map((s, i) => (
            <span
              key={s}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/70"
            >
              <span className="text-[#c9c5bd]">0{i + 1}</span>{s}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 px-6 pb-8 pt-6 sm:px-10">
        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{c.swipeToBegin[lang]}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5">
          <ArrowRight size={14} className="text-[#c9c5bd]" />
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
    <div className="flex h-full w-full select-none flex-col overflow-hidden bg-[#f8f7f4]">
      {/* Section header */}
      <div className="shrink-0 bg-[#414042] px-6 py-6 sm:px-8">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#c9c5bd]">{c.section[lang]}</p>
        <h2 className="text-2xl font-black uppercase tracking-[-0.025em] text-white sm:text-3xl">
          {c.title[lang]} <span className="text-[#c9c5bd]">{c.titleHighlight[lang]}</span>
        </h2>
        <p className="mt-2 text-xs font-medium text-white/50 sm:text-sm">{c.subtitle[lang]}</p>
      </div>

      {/* Items */}
      <div className="flex-1 space-y-3 overflow-auto px-5 py-5 sm:px-8 sm:py-7">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_6px_20px_rgba(65,64,66,0.04)]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-[#eeece8] text-xl">
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-[#2c2b2d]">{item.name}</p>
              <p className="mt-1 text-[11px] font-medium text-[#77736e] sm:text-xs">{item.desc}</p>
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
    <div className="flex h-full w-full select-none flex-col overflow-hidden bg-[#f8f7f4]">
      <div className="shrink-0 bg-[#414042] px-6 py-6 sm:px-8">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#c9c5bd]">{c.section[lang]}</p>
        <h2 className="text-2xl font-black uppercase tracking-[-0.025em] text-white sm:text-3xl">
          {c.title[lang]} <span className="text-[#c9c5bd]">{c.titleHighlight[lang]}</span>
        </h2>
        <p className="mt-2 text-xs font-medium text-white/50 sm:text-sm">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-5 py-5 sm:px-8 sm:py-7">
        {/* Step pills */}
        <div className="space-y-2">
          {c.steps[lang].map((step, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-black/[0.07] bg-white px-4 py-3.5">
              <span className="w-7 shrink-0 text-sm font-black text-[#aaa6a0]">0{i + 1}</span>
              <span className="text-xs font-black uppercase tracking-wide text-[#414042] sm:text-sm">{step}</span>
            </div>
          ))}
        </div>

        {/* Video CTA */}
        <a
          href="https://drive.google.com/file/d/1UweOzfVrftzw7_SDMZupCTmgiS3zsFpU/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[#e9e7e2] p-4 transition-colors hover:bg-[#dfdcd6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8b86] focus-visible:ring-offset-2 active:bg-[#d7d4ce]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#414042]">
            <span className="text-white text-base ml-0.5">▶</span>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#414042]">{c.watchLabel[lang]}</p>
            <p className="text-[11px] font-medium text-[#77736e]">{c.watchSub[lang]}</p>
          </div>
          <ExternalLink size={14} className="ml-auto shrink-0 text-[#77736e]" />
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
    <div className="flex h-full w-full select-none flex-col overflow-hidden bg-[#f8f7f4]">
      <div className="shrink-0 bg-[#414042] px-6 py-6 sm:px-8">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#c9c5bd]">{c.step[lang]}</p>
        <h2 className="text-2xl font-black uppercase tracking-[-0.025em] text-white sm:text-3xl">{c.title[lang]}</h2>
        <p className="mt-2 text-xs font-medium text-white/50 sm:text-sm">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-5 py-5 sm:px-8 sm:py-7">
        <div className="space-y-1 rounded-2xl border border-black/[0.07] bg-white p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#85817c]">{c.whyLabel[lang]}</p>
          <p className="text-sm font-medium leading-relaxed text-[#514f51]">
            {c.whyText[lang]}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">{c.checklistLabel[lang]}</p>
          {c.checklist[lang].map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/15 bg-[#e4e1dc]">
                <div className="h-2 w-2 rounded-full bg-[#414042]" />
              </div>
              <p className="text-xs font-bold leading-snug text-[#514f51] sm:text-sm">{item}</p>
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
    <div className="flex h-full w-full select-none flex-col overflow-hidden bg-[#f8f7f4]">
      <div className="shrink-0 bg-[#414042] px-6 py-6 sm:px-8">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#c9c5bd]">{c.step[lang]}</p>
        <h2 className="text-2xl font-black uppercase tracking-[-0.025em] text-white sm:text-3xl">{c.title[lang]}</h2>
        <p className="mt-2 text-xs font-medium text-white/50 sm:text-sm">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-5 py-5 sm:px-8 sm:py-7">
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
        <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_8px_24px_rgba(65,64,66,0.05)]">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#77736e]">{c.exampleLabel[lang]}</p>
          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-800">
            <span>10mg</span>
            <span className="text-slate-400">+</span>
            <span>2mL BAC Water</span>
            <span className="text-slate-400">=</span>
            <span className="font-black text-[#414042]">5mg/mL</span>
          </div>
          <div className="space-y-1.5 border-t border-black/10 pt-3">
            {[
              ["0.5mg", "0.1mL"],
              ["1mg", "0.2mL"],
              ["2mg", "0.4mL"],
            ].map(([dose, vol]) => (
              <div key={dose} className="flex items-center justify-between text-[12px] font-bold text-slate-700">
                <span>{c.applyLabel[lang]} <span className="text-[#414042]">{dose}</span></span>
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
          className="flex items-center gap-2 rounded-md text-[11px] font-black uppercase tracking-wide text-[#414042] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8b86] focus-visible:ring-offset-2"
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
    <div className="flex h-full w-full select-none flex-col overflow-hidden bg-[#f8f7f4]">
      <div className="shrink-0 bg-[#414042] px-6 py-6 sm:px-8">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#c9c5bd]">{c.step[lang]}</p>
        <h2 className="text-2xl font-black uppercase tracking-[-0.025em] text-white sm:text-3xl">{c.title[lang]}</h2>
        <p className="mt-2 text-xs font-medium text-white/50 sm:text-sm">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-auto px-5 py-5 sm:px-8 sm:py-7">
        {c.steps[lang].map((step, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-black/[0.07] bg-white p-3.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#414042] text-[10px] font-black text-white">
              {i + 1}
            </span>
            <p className="text-xs font-bold leading-snug text-[#514f51] sm:text-sm">{step}</p>
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
    <div className="flex h-full w-full select-none flex-col overflow-hidden bg-[#f8f7f4]">
      <div className="shrink-0 bg-[#414042] px-6 py-6 sm:px-8">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#c9c5bd]">{c.step[lang]}</p>
        <h2 className="text-2xl font-black uppercase tracking-[-0.025em] text-white sm:text-3xl">{c.title[lang]}</h2>
        <p className="mt-2 text-xs font-medium text-white/50 sm:text-sm">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-5 py-5 sm:px-8 sm:py-7">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">{c.checklistLabel[lang]}</p>
          {c.checklist[lang].map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/15 bg-[#e4e1dc]">
                <div className="h-2 w-2 rounded-full bg-[#414042]" />
              </div>
              <p className="text-xs font-bold leading-snug text-[#514f51] sm:text-sm">{item}</p>
            </div>
          ))}
        </div>

        <a
          href="https://particlepeptides.com/en/content/48-peptide-calculator"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-2xl bg-[#414042] p-4 text-white transition-colors hover:bg-[#2c2b2d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8b86] focus-visible:ring-offset-2 active:bg-[#242326]"
        >
          <div>
            <p className="text-[12px] font-black uppercase tracking-wide">{c.calculatorLabel[lang]}</p>
            <p className="text-[10px] text-white/50 font-medium mt-0.5">{c.calculatorSub[lang]}</p>
          </div>
          <ExternalLink size={16} className="shrink-0 text-[#c9c5bd]" />
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
    <div className="flex h-full w-full select-none flex-col overflow-hidden bg-[#f8f7f4]">
      <div className="shrink-0 bg-[#414042] px-6 py-6 sm:px-8">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#c9c5bd]">{c.step[lang]}</p>
        <h2 className="text-2xl font-black uppercase tracking-[-0.025em] text-white sm:text-3xl">{c.title[lang]}</h2>
        <p className="mt-2 text-xs font-medium text-white/50 sm:text-sm">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-5 py-5 sm:px-8 sm:py-7">
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
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/15 bg-[#e4e1dc]">
                <div className="h-2 w-2 rounded-full bg-[#414042]" />
              </div>
              <p className="text-xs font-bold leading-snug text-[#514f51] sm:text-sm">{step}</p>
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
    <div className="flex h-full w-full select-none flex-col overflow-hidden bg-[#f8f7f4]">
      <div className="shrink-0 bg-[#414042] px-6 py-6 sm:px-8">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#c9c5bd]">{c.step[lang]}</p>
        <h2 className="text-2xl font-black uppercase tracking-[-0.025em] text-white sm:text-3xl">{c.title[lang]}</h2>
        <p className="mt-2 text-xs font-medium text-white/50 sm:text-sm">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-5 py-5 sm:px-8 sm:py-7">
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
    <div className="flex h-full w-full select-none flex-col overflow-hidden bg-[#f8f7f4]">
      <div className="shrink-0 bg-[#414042] px-6 py-6 sm:px-8">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#c9c5bd]">{c.sectionLabel[lang]}</p>
        <h2 className="text-2xl font-black uppercase tracking-[-0.025em] text-white sm:text-3xl">
          {c.title[lang]} <span className="text-[#c9c5bd]">{c.titleHighlight[lang]}</span>
        </h2>
        <p className="mt-2 text-xs font-medium text-white/50 sm:text-sm">{c.subtitle[lang]}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-5 py-5 sm:px-8 sm:py-7">
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
          className="flex items-center justify-center gap-3 rounded-2xl bg-[#414042] p-4 text-[13px] font-black uppercase tracking-[0.15em] text-white shadow-[0_12px_30px_rgba(65,64,66,0.22)] transition-all hover:bg-[#242326] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8b86] focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          {c.goToShop[lang]} <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
