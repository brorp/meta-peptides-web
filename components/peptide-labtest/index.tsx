"use client";

import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Download, FileCheck, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LabTestInterface, useGetLabTests } from "@/hooks/api/useGetLabTests";
import LabTestSkeleton from "../skeleton/lab-card-skeleton";

// ─── Image Lightbox Modal ───────────────────────────────────────────────────
function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);

  const prev = useCallback(() => setIdx((i) => (i > 0 ? i - 1 : images.length - 1)), [images.length]);
  const next = useCallback(() => setIdx((i) => (i < images.length - 1 ? i + 1 : 0)), [images.length]);

  // Keyboard navigation & ESC close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all"
        aria-label="Close preview"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold tracking-widest uppercase">
          {idx + 1} / {images.length}
        </div>
      )}

      {/* Prev arrow */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Main image */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={idx}
          src={images[idx]}
          alt={`COA image ${idx + 1}`}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
        />
      </div>

      {/* Next arrow */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Thumbnail strip — only if 2+ images */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                i === idx ? "border-accent scale-110 shadow-lg" : "border-white/30 opacity-60 hover:opacity-90"
              }`}
              aria-label={`Go to image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────
export default function PeptideLabTestComponent() {
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const { data: response, isLoading } = useGetLabTests({
    page,
    search: keyword,
    limit: 9,
  });

  const labTests = Array.isArray(response?.data) ? response?.data : [];
  const pagination = response?.pagination;

  return (
    <div className="min-h-screen bg-background selection:bg-accent/30">
      {/* Hero Section */}
      <section className="relative pt-32 pb-12 overflow-hidden bg-[#414042]">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[0.85] uppercase italic">
            Laboratory <br />
            <span className="text-accent">Reports.</span>
          </h1>
          <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <p className="text-slate-400 text-xl font-medium leading-relaxed italic max-w-2xl">
              Before purchasing from any vendor, make sure to verify the
              Certificate of Analysis (COA).
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <LabTestSkeleton key={i} />
                ))
              : labTests.map((test) => (
                  <LabTestCard key={test.id} test={test} />
                ))}
          </div>

          {!isLoading && labTests.length === 0 && (
            <div className="text-center py-20">
              <p className="text-primary italic">
                No laboratory reports found for &quot;{keyword}&quot;
              </p>
            </div>
          )}

          {/* Pagination UI */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex justify-center items-center gap-4">
              <Button
                variant="outline"
                disabled={!pagination.has_prev}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-xl"
              >
                Previous
              </Button>
              <span className="text-sm font-bold uppercase tracking-widest">
                Page {pagination.current_page} of {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                disabled={!pagination.has_next}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Lab Test Card ──────────────────────────────────────────────────────────
function LabTestCard({ test }: { test: LabTestInterface }) {
  const [activeImage, setActiveImage] = useState(test.report_images[0]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const images = test.report_images ?? [];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <Card className="relative flex flex-col p-3 rounded-[2rem] border-none bg-slate-50/50 hover:bg-white hover:shadow-[20px_40px_40px_-10px_rgba(0,0,0,0.05)] transition-all duration-500 group">
        {/* Main image — click opens lightbox */}
        <button
          type="button"
          onClick={() => openLightbox(images.indexOf(activeImage))}
          className="relative aspect-[1/1.4] rounded-[1.5rem] overflow-hidden bg-white border border-slate-200 block shadow-sm hover:shadow-md transition-shadow w-full"
          aria-label="Preview COA image"
        >
          <Image
            src={activeImage || "/placeholder-lab.jpg"}
            alt={test.product?.name || "Lab Test"}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Zoom hint overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <ZoomIn className="w-5 h-5 text-slate-700" />
            </div>
          </div>

          <div className="absolute top-3 right-3 flex items-center">
            {/* Outer Glow */}
            <div className="absolute inset-0 bg-accent/20 blur-md rounded-full animate-pulse" />

            <div className="relative flex items-center gap-2 bg-black/70 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 shadow-2xl">
              {/* Indicator Dot */}
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative rounded-full h-1.5 w-1.5 bg-accent"></span>
              </span>

              {/* Inline Text */}
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] text-accent font-black tracking-[0.15em] uppercase border-r border-white/20 pr-1.5">
                  Verified
                </span>
                <span className="text-white text-[10px] font-black tracking-tighter uppercase italic">
                  {test.purity_level}{" "}
                  <span className="text-accent/80 not-italic ml-0.5">Purity</span>
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Thumbnail strip — only if 2 images */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-3 px-1 overflow-x-auto pb-1 scrollbar-hide">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImage(img)}
                className={`relative h-12 w-12 shrink-0 rounded-xl overflow-hidden border transition-all duration-300 ${
                  activeImage === img
                    ? "border-accent ring-2 ring-accent/30 scale-95"
                    : "border-transparent opacity-50 hover:opacity-100"
                }`}
                aria-label={`View image ${idx + 1}`}
              >
                <Image src={img} alt="detail" fill className="object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 px-2 pb-2 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-accent/70 uppercase tracking-widest">
                COA &bull;{" "}
                {new Date(test.test_date)
                  .toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                  .toUpperCase()}
              </p>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                {test.product?.name}
              </h3>
            </div>
            <FileCheck className="w-5 h-5 text-slate-300 group-hover:text-accent transition-colors" />
          </div>

          {/* Action buttons row */}
          <div className="flex gap-2">
            {/* Preview all images */}
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 text-[9px] font-black uppercase tracking-[0.12em] hover:bg-slate-50 hover:border-accent hover:text-accent transition-all duration-300 flex items-center justify-center gap-1.5"
            >
              <ZoomIn className="w-3 h-3" />
              {images.length > 1 ? `View ${images.length} Images` : "View Image"}
            </button>

            {/* Download / external */}
            <a
              href={test.report_url || test.report_images?.[0] || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 group/btn"
            >
              <Button className="w-full h-10 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-[0.12em] hover:bg-accent hover:text-white transition-all duration-300">
                <Download className="w-3 h-3 mr-1.5 group-hover/btn:translate-y-0.5 transition-transform" />
                Download COA
              </Button>
            </a>
          </div>
        </div>
      </Card>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
