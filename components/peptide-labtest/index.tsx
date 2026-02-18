"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Download, FileCheck, Beaker, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface LabTest {
  id: string;
  name: string;
  purity: string;
  date: string;
  pdfLink: string;
  images: string[];
}

const labTests: LabTest[] = [
  {
    id: "RT-01",
    name: "Retatrutide 10mg",
    purity: "99.4%",
    date: "FEB 2026",
    pdfLink: "#",
    images: [
      // Gambar Utama (Lab Equipment)
      "https://images.pexels.com/photos/3735709/pexels-photo-3735709.jpeg?auto=compress&w=800",
      // Detail 1 (Microscope view)
      "https://images.pexels.com/photos/3913025/pexels-photo-3913025.jpeg?auto=compress&w=400",
      // Detail 2 (Chemical Flask)
      "https://images.pexels.com/photos/3184423/pexels-photo-3184423.jpeg?auto=compress&w=400",
      // Detail 3 (Researcher)
      "https://images.pexels.com/photos/3825527/pexels-photo-3825527.jpeg?auto=compress&w=400",
    ],
  },
  {
    id: "TZ-05",
    name: "Tirzepatide 5mg",
    purity: "99.8%",
    date: "JAN 2026",
    pdfLink: "#",
    images: [
      // Gambar Utama (Picsum Tech)
      "https://picsum.photos/seed/lab-vial/800/600",
      // Detail 1
      "https://picsum.photos/seed/science1/400/400",
      // Detail 2
      "https://picsum.photos/seed/tech2/400/400",
      // Detail 3
      "https://picsum.photos/seed/medical3/400/400",
    ],
  },
  {
    id: "CG-09",
    name: "Cagrilintide 5mg",
    purity: "99.1%",
    date: "FEB 2026",
    pdfLink: "#",
    images: [
      // Gambar Utama (Modern Lab)
      "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&w=800",
      // Detail 1
      "https://images.pexels.com/photos/267520/pexels-photo-267520.jpeg?auto=compress&w=400",
      // Detail 2
      "https://images.pexels.com/photos/256262/pexels-photo-256262.jpeg?auto=compress&w=400",
      // Detail 3
      "https://images.pexels.com/photos/7089617/pexels-photo-7089617.jpeg?auto=compress&w=400",
    ],
  },
];

export default function PeptideLabTestComponent() {
  return (
    <div className="min-h-screen bg-background selection:bg-accent/30">
      {/* --- HERO SECTION: Diperpendek pt & pb nya --- */}
      <section className="relative pt-32 pb-12 overflow-hidden bg-[#0F172A]">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[0.85] uppercase italic">
            Laboratory <br />
            <span className="text-accent">Reports.</span>
          </h1>
          {/* H2 disesuaikan jadi deskripsi kecil yang sleek */}
          <p className="text-slate-400 text-xl font-medium leading-relaxed italic max-w-2xl">
            Before purchasing from any vendor, make sure to verify the
            Certificate of Analysis (COA).
          </p>
        </div>
      </section>

      {/* --- CONTENT SECTION: Padding dikurangi --- */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {" "}
            {/* Menjadi 3 kolom di layar besar agar lebih compact */}
            {labTests.map((test) => (
              <LabTestCard key={test.id} test={test} />
            ))}
          </div>

          {/* Footer CTA: Dikecilkan --- */}
          <div className="text-center py-6 space-y-4 border-t border-border/50">
            <h4 className="text-xl font-black uppercase italic tracking-tighter">
              Ready to Advance Your Research?
            </h4>
            <Link href="/contact" className="inline-block">
              <Button
                size="sm"
                className="h-12 px-8 bg-accent hover:bg-accent/80 text-white rounded-xl font-black uppercase tracking-widest text-[10px]"
              >
                Contact Specialist
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function LabTestCard({ test }: { test: LabTest }) {
  const [activeImage, setActiveImage] = useState(test.images[0]);

  return (
    <Card className="relative flex flex-col p-3 rounded-[2rem] border-none bg-slate-50/50 hover:bg-white hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] transition-all duration-500 group">
      {/* Main Preview: Aspect ratio dikecilkan sedikit */}
      <div className="relative aspect-video rounded-[1.5rem] overflow-hidden bg-white border border-slate-100">
        <Image
          src={activeImage}
          alt={test.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full border border-white/5">
          <span className="text-white text-[8px] font-black tracking-widest uppercase italic">
            {test.purity} Purity
          </span>
        </div>
      </div>

      {/* Thumbnails: Lebih kecil */}
      <div className="grid grid-cols-3 gap-2 mt-3 px-1">
        {test.images.slice(1, 4).map((img, idx) => (
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

      {/* Info Area: Padding & Text dikecilkan */}
      <div className="mt-4 px-2 pb-2 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-accent/70 uppercase tracking-widest">
              #{test.id} &bull; {test.date}
            </p>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              {test.name}
            </h3>
          </div>
          <FileCheck className="w-5 h-5 text-slate-300 group-hover:text-accent transition-colors" />
        </div>

        <a
          href={test.pdfLink}
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
