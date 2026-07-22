"use client";

import { useEffect, useRef } from "react";

type LoopingVideoProps = {
  src: string;
  className?: string;
  /** Fraction of the element that must be visible to trigger play. Default: 0.25 */
  threshold?: number;
};

/**
 * Lightweight GIF-like looping video.
 * - Native <video> only — zero external deps.
 * - Plays when scrolled into view via IntersectionObserver.
 * - Resets to start on each new intersection so it always plays fresh.
 * - muted + playsInline required for browser autoplay policies.
 */
export function LoopingVideo({
  src,
  className,
  threshold = 0.25,
}: LoopingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.currentTime = 0;
          // play() returns a Promise; swallow AbortError from rapid scrolling
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <video
      ref={videoRef}
      src={src}
      loop
      muted
      playsInline
      preload="metadata"
      className={className}
      // Fallback: if IntersectionObserver fires before effect, still autoplay
      autoPlay
    />
  );
}
