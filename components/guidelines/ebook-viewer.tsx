"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Lang } from "./translations";
import {
  SlideCover,
  SlidePackage,
  SlideOverview,
  SlideSanitization,
  SlideConcentration,
  SlideReconstitution,
  SlideDosing,
  SlideApplication,
  SlideStorage,
  SlideClosing,
} from "./slides";

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

export default function GuidelinesEbookViewer() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [lang, setLang] = useState<Lang>("ID");

  const TOTAL = 10;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= TOTAL) return;
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current]
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const progress = ((current + 1) / TOTAL) * 100;

  const renderSlide = () => {
    switch (current) {
      case 0:
        return <SlideCover lang={lang} onLangChange={setLang} />;
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
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">
      {/* ── Progress bar ── */}
      <div className="absolute top-0 left-0 right-0 z-50 h-[3px] bg-slate-100">
        <motion.div
          className="h-full bg-emerald-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* ── Slide area with drag ── */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) next();
              if (info.offset.x > 50) prev();
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom chrome ── */}
      <div className="shrink-0 px-4 py-3 bg-white border-t border-slate-100 flex items-center gap-3">
        {/* Prev button */}
        <button
          onClick={prev}
          disabled={current === 0}
          className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
          aria-label="Previous slide"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Dot indicator */}
        <div className="flex-1 flex items-center justify-center gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-5 h-2 bg-emerald-500"
                  : i < current
                  ? "w-2 h-2 bg-emerald-300"
                  : "w-2 h-2 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={next}
          disabled={current === TOTAL - 1}
          className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
          aria-label="Next slide"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Slide counter */}
      <div className="absolute top-3 right-4 z-50">
        <span className="text-[10px] font-black text-slate-400 tabular-nums">
          {current + 1} / {TOTAL}
        </span>
      </div>
    </div>
  );
}
