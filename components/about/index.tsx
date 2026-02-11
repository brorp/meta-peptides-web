"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import {
  Users,
  Target,
  Award,
  Globe,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { teamMembers } from "@/contants/about-us";

export default function AboutPageComponent() {
  const values = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "Quality First",
      description:
        "Rigorous third-party testing via HPLC/MS ensures ≥99% purity and absolute consistency.",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Global Reach",
      description:
        "Supporting scientific discovery in over 50 countries with temperature-controlled logistics.",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Radical Transparency",
      description:
        "Accessible COA reports for every batch. No hidden data, no compromised quality.",
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "ISO Standard",
      description:
        "Operating under ISO 9001:2015 standards to exceed industry quality benchmarks.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/20">
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-24 overflow-hidden bg-[#0F172A]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] -mr-40 -mt-40 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-black uppercase tracking-[0.2em]">
              Our Identity
            </div>
            <h1 className="text-6xl lg:text-8xl font-black text-white tracking-tighter leading-[0.85]">
              BEYOND THE <br />
              <span className="text-accent italic">MOLECULE.</span>
            </h1>
            <p className="text-slate-400 text-xl font-medium leading-relaxed italic max-w-2xl">
              Leading the global scientific community by providing
              high-precision research compounds that define the gold standard of
              purity.
            </p>
          </div>
        </div>
      </section>

      {/* --- MISSION & VISION (Split Layout) --- */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <div className="space-y-6">
                <h2 className="text-4xl font-black tracking-tighter uppercase italic">
                  Our Mission
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  At MetaPeptides, we bridge the gap between complex
                  biochemistry and laboratory efficiency. We believe that{" "}
                  <span className="text-foreground font-bold">
                    breakthrough research
                  </span>{" "}
                  requires tools that are beyond reproach.
                </p>
                <div className="h-1 w-20 bg-accent rounded-full" />
              </div>
              <div className="space-y-6">
                <h2 className="text-4xl font-black tracking-tighter uppercase italic text-right lg:text-left">
                  Our Vision
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed text-right lg:text-left">
                  To be the world’s most trusted catalyst for scientific
                  advancement, ensuring every researcher has access to the{" "}
                  <span className="text-foreground font-bold">
                    purest synthetic compounds
                  </span>
                  available on the market.
                </p>
                <div className="h-1 w-20 bg-accent rounded-full ml-auto lg:ml-0" />
              </div>
            </div>
            {/* Visual Element */}
            <div className="relative aspect-square bg-muted rounded-[3rem] overflow-hidden flex items-center justify-center border border-border">
              <div className="text-[12rem] opacity-20 filter grayscale">🧬</div>
              <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* --- VALUES GRID --- */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-5xl font-black tracking-tighter uppercase">
              Core Principles
            </h2>
            <div className="w-16 h-1 bg-accent mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, i) => (
              <Card
                key={i}
                className="group p-10 border-none bg-white shadow-xl shadow-slate-200/50 rounded-[2.5rem] hover:bg-accent transition-all duration-500"
              >
                <div className="w-12 h-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center mb-8 group-hover:bg-white/20 group-hover:text-white transition-colors">
                  {value.icon}
                </div>
                <h3 className="text-xl font-black mb-4 group-hover:text-white uppercase tracking-tight">
                  {value.title}
                </h3>
                <p className="text-muted-foreground group-hover:text-white/80 text-sm leading-relaxed font-medium">
                  {value.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* --- TEAM SECTION (Professional Cards) --- */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div className="space-y-4">
              <h2 className="text-5xl font-black tracking-tighter uppercase">
                The Experts
              </h2>
              <p className="text-muted-foreground font-medium italic">
                Combining decades of pharmaceutical and quality assurance
                expertise.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {teamMembers.map((member, i) => (
              <div key={i} className="group">
                <div className="aspect-[3/4] bg-muted rounded-[2rem] mb-6 overflow-hidden relative flex items-center justify-center border border-border group-hover:border-accent transition-all">
                  <span className="text-5xl font-black text-muted-foreground/30 group-hover:text-accent/30 transition-colors uppercase">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-2 rounded-xl border border-white/50 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                    <ArrowRight className="w-4 h-4 text-accent" />
                  </div>
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight">
                  {member.name}
                </h3>
                <p className="text-xs font-black text-accent uppercase tracking-widest mb-3">
                  {member.role}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- QUALITY BADGE (The Premium Card) --- */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-[#0F172A] rounded-[3rem] p-12 lg:p-20 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px]" />
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none uppercase">
                  Quality <br /> Commitment.
                </h2>
                <p className="text-white/60 font-medium">
                  We don't just supply; we verify. Every single molecule is
                  tracked, tested, and sealed.
                </p>
              </div>
              <div className="grid gap-4">
                {[
                  "Independent 3rd Party Testing",
                  "ISO 9001:2015 Management",
                  "Full Batch Traceability",
                  "Cold-Chain Logistics",
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    <CheckCircle2 className="text-accent w-5 h-5 flex-shrink-0" />
                    <span className="text-white font-bold text-sm tracking-tight">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-32 text-center">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-6xl font-black tracking-tighter uppercase italic leading-none">
            Ready to <span className="text-accent">Empower</span> <br /> Your
            Research?
          </h2>
          <div className="flex justify-center gap-6">
            <Link href="/shop">
              <Button className="h-16 px-12 rounded-2xl bg-accent hover:bg-accent/90 text-white font-black text-xl shadow-2xl shadow-accent/40">
                Browse Shop
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
