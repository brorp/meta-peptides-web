"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const ASSET_BASE = "/ads/meta-fit";

const TESTIMONY_SLIDES = [
  { fileName: "3.png",          alt: "Customer consultation chat proof 2", width: 828,  height: 1792 },
  { fileName: "9.png",          alt: "Customer consultation chat proof 3", width: 828,  height: 1792 },
  { fileName: "6.png",          alt: "Customer consultation chat proof 4", width: 828,  height: 1792 },
  { fileName: "4.png",          alt: "Customer consultation chat proof 5", width: 828,  height: 1792 },
  { fileName: "10.png",         alt: "Customer consultation chat proof 6", width: 828,  height: 1792 },
  { fileName: "11.png",         alt: "Customer consultation chat proof 7", width: 828,  height: 1792 },
  { fileName: "14.png",         alt: "Customer consultation chat proof 8", width: 828,  height: 1792 },
  { fileName: "17.png",         alt: "Customer consultation chat proof 9", width: 828,  height: 1792 },
];

const AUTOPLAY_MS = 7000;
const TRANSITION_MS = 380;
const TOTAL = TESTIMONY_SLIDES.length;

type TransitionDir = "right" | "left";

export function TestimonyCarousel() {
  const [current, setCurrent] = useState(0);
  const [animClass, setAnimClass] = useState("opacity-100 translate-x-0");

  const currentRef = useRef(0);
  const busy = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function goTo(next: number, dir: TransitionDir) {
    if (busy.current) return;
    busy.current = true;

    // Fade + slide out
    const exitClass =
      dir === "right"
        ? "opacity-0 translate-x-10"
        : "opacity-0 -translate-x-10";
    setAnimClass(exitClass);

    setTimeout(() => {
      currentRef.current = next;
      setCurrent(next);

      // Place new slide on the opposite side (instant, no transition)
      setAnimClass(
        dir === "right"
          ? "opacity-0 -translate-x-10 !duration-0"
          : "opacity-0 translate-x-10 !duration-0",
      );

      // Then animate into view next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimClass("opacity-100 translate-x-0");
          setTimeout(() => {
            busy.current = false;
          }, TRANSITION_MS);
        });
      });
    }, TRANSITION_MS);
  }

  function startAutoplay() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!busy.current) {
        const next = (currentRef.current + 1) % TOTAL;
        goTo(next, "right");
      }
    }, AUTOPLAY_MS);
  }

  useEffect(() => {
    startAutoplay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePrev() {
    goTo((currentRef.current - 1 + TOTAL) % TOTAL, "left");
    startAutoplay();
  }

  function handleNext() {
    goTo((currentRef.current + 1) % TOTAL, "right");
    startAutoplay();
  }

  function handleDot(i: number) {
    if (i === currentRef.current || busy.current) return;
    goTo(i, i > currentRef.current ? "right" : "left");
    startAutoplay();
  }

  const touchX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) handleNext();
      else handlePrev();
    }
    touchX.current = null;
  }

  const slide = TESTIMONY_SLIDES[current];

  return (
    <div className="relative w-full select-none bg-white">
      {/* Slide — constrained to 50% width, centered */}
      <div
        className="relative mx-auto w-1/2"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${animClass}`}
          style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        >
          <Image
            src={`${ASSET_BASE}/${slide.fileName}`}
            alt={slide.alt}
            width={slide.width}
            height={slide.height}
            sizes="50vw"
            className="block h-auto w-full"
            priority={current === 0}
          />
        </div>

        {/* Counter badge — inside image area */}
        <p className="pointer-events-none absolute right-2 top-2 z-10 rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {current + 1} / {TOTAL}
        </p>

        {/* Prev button — left edge of image */}
        <button
          onClick={handlePrev}
          aria-label="Previous testimony"
          className="absolute left-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#414042]/70 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-[#414042] active:scale-90 sm:h-10 sm:w-10 sm:left-5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 sm:h-5 sm:w-5"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Next button — right edge of image */}
        <button
          onClick={handleNext}
          aria-label="Next testimony"
          className="absolute right-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#414042]/70 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-[#414042] active:scale-90 sm:h-10 sm:w-10 sm:right-5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 sm:h-5 sm:w-5"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>


      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 py-4">
        {TESTIMONY_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDot(i)}
            aria-label={`Go to testimony ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 bg-[#414042]"
                : "w-2 bg-[#414042]/30 hover:bg-[#414042]/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
