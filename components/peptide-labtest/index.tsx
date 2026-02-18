"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Download, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LabTestInterface, useGetLabTests } from "@/hooks/api/useGetLabTests";
import LabTestSkeleton from "../skeleton/lab-card-skeleton";

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
      <section className="relative pt-32 pb-12 overflow-hidden bg-[#0F172A]">
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
              <p className="text-slate-500 italic">
                No laboratory reports found for "{keyword}"
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

function LabTestCard({ test }: { test: LabTestInterface }) {
  const [activeImage, setActiveImage] = useState(test.report_images[0]);

  return (
    <Card className="relative flex flex-col p-3 rounded-[2rem] border-none bg-slate-50/50 hover:bg-white hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] transition-all duration-500 group">
      <div className="relative aspect-video rounded-[1.5rem] overflow-hidden bg-white border border-slate-100">
        <Image
          src={activeImage || "/placeholder-lab.jpg"}
          alt={test.product?.name || "Lab Test"}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
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
      </div>

      {/* Detail Thumbnails */}
      <div className="grid grid-cols-3 gap-2 mt-3 px-1">
        {test.report_images.slice(0, 3).map((img, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveImage(img)}
            className={`relative aspect-square rounded-xl overflow-hidden border transition-all duration-300 ${
              activeImage === img
                ? "border-accent scale-90"
                : "border-transparent opacity-40 hover:opacity-100"
            }`}
          >
            <Image src={img} alt="detail" fill className="object-cover" />
          </button>
        ))}
      </div>

      <div className="mt-4 px-2 pb-2 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-accent/70 uppercase tracking-widest">
              {/* Memformat tanggal dari DB (YYYY-MM-DD) ke (MON YYYY) */}
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

        <a
          href={test.report_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group/btn"
        >
          <Button className="w-full h-10 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-[0.15em] hover:bg-accent transition-all duration-300">
            <Download className="w-3 h-3 mr-2 group-hover/btn:translate-y-0.5 transition-transform" />
            Download COA
          </Button>
        </a>
      </div>
    </Card>
  );
}
