"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

function RouteChangeListener({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onNavigate();
  }, [pathname, searchParams, onNavigate]);

  return null;
}

export function PageLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const minDuration = 1000; // 1s minimum animation display duration
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startTimeRef.current = Date.now();
    setIsLoading(true);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const stopLoading = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, minDuration - elapsed);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, remaining);
  }, []);

  // Initial page load handler
  useEffect(() => {
    startTimeRef.current = Date.now();
    stopLoading();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stopLoading]);

  // Intercept click on internal links for instantaneous transition feedback
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      // Find nearest anchor tag
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      if (
        href &&
        !href.startsWith("#") &&
        !href.startsWith("javascript:") &&
        !href.startsWith("tel:") &&
        !href.startsWith("mailto:") &&
        targetAttr !== "_blank"
      ) {
        try {
          const destination = new URL(href, window.location.href);
          const current = new URL(window.location.href);

          // Trigger loader if navigating to a different page/path or query parameter
          if (
            destination.origin === current.origin &&
            (destination.pathname !== current.pathname || destination.search !== current.search)
          ) {
            startLoading();
          }
        } catch {
          // ignore invalid URLs
        }
      }
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, [startLoading]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteChangeListener onNavigate={stopLoading} />
      </Suspense>

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="page-loader"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black select-none pointer-events-auto overflow-hidden"
          >
            <video
              ref={videoRef}
              src="/Animasi%20Logotype%201s.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
