"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Lang } from "./translations";
import {
  SlideApplication,
  SlideClosing,
  SlideConcentration,
  SlideCover,
  SlideDosing,
  SlideOverview,
  SlidePackage,
  SlideReconstitution,
  SlideSanitization,
  SlideStorage,
} from "./slides";

const chapters = {
  ID: [
    "Mulai",
    "Isi Paket",
    "Alur Panduan",
    "Sanitasi",
    "Konsentrasi",
    "Reconstitution",
    "Dosing",
    "Aplikasi",
    "Penyimpanan",
    "Selesai",
  ],
  EN: [
    "Start",
    "Package",
    "Guide Overview",
    "Sanitization",
    "Concentration",
    "Reconstitution",
    "Dosing",
    "Application",
    "Storage",
    "Complete",
  ],
} satisfies Record<Lang, string[]>;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "8%" : "-8%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? "-8%" : "8%",
    opacity: 0,
  }),
};

export default function GuidelinesEbookViewer() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [lang, setLang] = useState<Lang>("ID");

  const total = chapters[lang].length;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= total || index === current) return;
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current, total],
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const progress = ((current + 1) / total) * 100;

  const renderSlide = () => {
    switch (current) {
      case 0:
        return <SlideCover lang={lang} />;
      case 1:
        return <SlidePackage lang={lang} />;
      case 2:
        return <SlideOverview lang={lang} />;
      case 3:
        return <SlideSanitization lang={lang} />;
      case 4:
        return <SlideConcentration lang={lang} />;
      case 5:
        return <SlideReconstitution lang={lang} />;
      case 6:
        return <SlideDosing lang={lang} />;
      case 7:
        return <SlideApplication lang={lang} />;
      case 8:
        return <SlideStorage lang={lang} />;
      case 9:
        return <SlideClosing lang={lang} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#eeece8] text-[#414042] selection:bg-[#414042] selection:text-white">
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(65,64,66,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(65,64,66,0.05)_1px,transparent_1px)] [background-size:32px_32px]" />

      <header className="relative z-40 shrink-0 border-b border-black/10 bg-[#eeece8]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-7xl items-center justify-between px-4 sm:h-[76px] sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              href="/"
              aria-label="Back to MetaPeptides home"
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-white transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8b86] focus-visible:ring-offset-2 sm:h-11 sm:w-11"
            >
              <Image
                src="/icon-meta.png"
                alt="MetaPeptides"
                width={44}
                height={44}
                className="h-full w-full object-cover"
                priority
              />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.24em] text-[#85817c]">
                MetaPeptides
              </p>
              <p className="truncate text-sm font-black uppercase tracking-[0.08em] text-[#2c2b2d] sm:text-base">
                Peptides Guide
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden items-center gap-2 rounded-md text-[11px] font-black uppercase tracking-[0.12em] text-[#77736e] transition-colors hover:text-[#242326] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8b86] focus-visible:ring-offset-2 sm:flex"
            >
              <ArrowLeft size={14} />
              Website
            </Link>
            <div className="flex items-center rounded-full border border-black/10 bg-white p-1 shadow-sm">
              {(["ID", "EN"] as Lang[]).map((language) => (
                <button
                  key={language}
                  onClick={() => setLang(language)}
                  className={`min-w-9 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8b86] sm:min-w-10 ${
                    lang === language
                      ? "bg-[#414042] text-white"
                      : "text-[#8a8782] hover:text-[#414042]"
                  }`}
                  aria-pressed={lang === language}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 min-h-0 flex-1 p-0 sm:p-5 lg:p-6">
        <div className="mx-auto flex h-full w-full max-w-7xl gap-5">
          <aside className="hidden w-60 shrink-0 flex-col overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/85 p-3 shadow-[0_20px_60px_rgba(65,64,66,0.08)] backdrop-blur lg:flex xl:w-64">
            <div className="flex items-center gap-3 border-b border-black/10 px-3 pb-4 pt-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#414042] text-white">
                <BookOpenText size={17} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9a9691]">
                  {lang === "ID" ? "Daftar Isi" : "Contents"}
                </p>
                <p className="text-xs font-black uppercase tracking-wide text-[#414042]">
                  {total} {lang === "ID" ? "Bagian" : "Chapters"}
                </p>
              </div>
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto py-3" aria-label="Guide chapters">
              {chapters[lang].map((chapter, index) => (
                <button
                  key={chapter}
                  onClick={() => goTo(index)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8b86] ${
                    current === index
                      ? "bg-[#414042] text-white"
                      : "text-[#6d6965] hover:bg-[#f0eeea] hover:text-[#2c2b2d]"
                  }`}
                  aria-current={current === index ? "step" : undefined}
                >
                  <span
                    className={`text-[10px] font-black tabular-nums ${
                      current === index ? "text-white/55" : "text-[#aaa6a0]"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-[11px] font-black uppercase tracking-[0.08em]">
                    {chapter}
                  </span>
                </button>
              ))}
            </nav>

            <div className="border-t border-black/10 px-3 pt-4">
              <div className="mb-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.16em] text-[#8f8b86]">
                <span>{lang === "ID" ? "Progres" : "Progress"}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#dedbd6]">
                <motion.div
                  className="h-full rounded-full bg-[#414042]"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white sm:rounded-[1.75rem] sm:border sm:border-black/10 sm:shadow-[0_24px_80px_rgba(65,64,66,0.13)]">
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="absolute left-0 right-0 top-0 z-30 h-1 bg-[#e4e1dc] lg:hidden">
                <motion.div
                  className="h-full bg-[#414042]"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>

              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.08}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) next();
                    if (info.offset.x > 60) prev();
                  }}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                >
                  {renderSlide()}
                </motion.div>
              </AnimatePresence>
            </div>

            <footer className="flex h-[68px] shrink-0 items-center gap-3 border-t border-black/10 bg-[#fbfaf8] px-4 sm:px-5">
              <button
                onClick={prev}
                disabled={current === 0}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-[#414042] transition-all hover:border-[#414042] hover:bg-[#414042] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8b86] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:border-black/10 disabled:hover:bg-white disabled:hover:text-[#414042]"
                aria-label="Previous slide"
              >
                <ChevronLeft size={17} />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-[#414042] sm:text-[11px]">
                  {chapters[lang][current]}
                </p>
                <p className="mt-0.5 text-[9px] font-bold tabular-nums text-[#aaa6a0]">
                  {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </p>
              </div>

              <button
                onClick={next}
                disabled={current === total - 1}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#414042] text-white transition-all hover:bg-[#242326] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8b86] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-25"
                aria-label="Next slide"
              >
                <ChevronRight size={17} />
              </button>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}
