"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ShieldCheck,
  Zap,
  Microscope,
  FlaskConical,
  Dna,
  ArrowRight,
  Globe2,
  Lock,
  ClipboardCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { features, GOLD_STANDARD_FEATURES } from "@/contants/home";
import { useRouter } from "next/navigation";

function Annotation({
  number,
  title,
  desc,
  className,
  dotPosition = "left",
}: {
  number: string;
  title: string;
  desc: string;
  className?: string;
  dotPosition?: "left" | "right" | "bottom";
}) {
  const positionClasses = {
    left: "left-12 top-[-20px]",
    right: "right-12 top-[-20px]",
    bottom: "-bottom-32 -right-28",
  };
  return (
    <div className={cn("absolute z-20 group/ann", className)}>
      <div className="relative">
        {/* Radar Pulse Dot */}
        <div className="flex h-6 w-6 items-center justify-center cursor-pointer">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-40"></span>
          <span className="relative inline-flex rounded-full h-5 w-5 bg-accent items-center justify-center text-[10px] font-black text-white shadow-lg shadow-accent/40 border border-white/20">
            {number}
          </span>
        </div>

        {/* Annotation Card Container */}
        <div
          className={cn(
            "absolute w-56 p-4 bg-white/95 backdrop-blur-xl border border-white/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 opacity-0 group-hover/ann:opacity-100 scale-95 group-hover/ann:scale-100 pointer-events-none group-hover/ann:pointer-events-auto",
            positionClasses[dotPosition],
          )}
        >
          <div className="space-y-1">
            <p className="text-[10px] font-black text-accent uppercase tracking-widest leading-none">
              Feature {number}
            </p>
            <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
          </div>

          {/* Connector Line (SVG) */}
          <div
            className={cn(
              "absolute top-5 h-px bg-accent/20 w-8",
              dotPosition === "left" ? "-left-8" : "-right-8",
            )}
          />
        </div>
      </div>
    </div>
  );
}

export default function HomePageComponent() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen lg:min-h-[95vh] flex items-center pt-32 pb-12 lg:pt-20 lg:pb-0 overflow-hidden">
        {/* Bg Blobs - Adjusted for mobile */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-5%] right-[-5%] w-[300px] h-[300px] lg:w-[600px] lg:h-[600px] bg-accent/10 rounded-full blur-[80px] lg:blur-[120px] animate-pulse" />
          <div className="absolute bottom-[5%] left-[-5%] w-[250px] h-[250px] lg:w-[500px] lg:h-[500px] bg-primary/5 rounded-full blur-[80px] lg:blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8 text-center lg:text-left order-2 lg:order-1 relative z-10 mt-1 md:mt-20 ">
              <div className="space-y-4 ">
                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-2 rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                  </span>
                  ISO 9001:2015 CERTIFIED LAB
                </div>

                {/* Typography Headline */}
                <div className="space-y-6">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-[-0.03em] leading-[1.1] lg:leading-[1] text-slate-900">
                    Indonesia’s <br />
                    <span className="text-slate-400 font-light italic">
                      Reliable
                    </span>{" "}
                    Source <br />
                    <span className="text-accent italic tracking-[-0.04em]">
                      for Research Peptides.
                    </span>
                  </h1>

                  <p className="text-base lg:text-xl text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                    Verified sourcing with{" "}
                    <span className="text-slate-900 font-bold underline decoration-accent/30 decoration-2 underline-offset-8">
                      99%+ purity
                    </span>{" "}
                    and secure packaging—delivering professionally across
                    Indonesia.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Button
                    onClick={() => {
                      router.push("/shop");
                    }}
                    className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-accent text-white font-bold uppercase tracking-widest text-xs transition-all shadow-xl shadow-slate-200 group"
                  >
                    Explore Products
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  <Button
                    variant="outline"
                    className="h-14 px-8 rounded-2xl border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                    onClick={() => {
                      router.push("/about");
                    }}
                  >
                    Learn more about Peptides
                  </Button>
                </div>
              </div>

              {/* Stats Section */}
              <div className="flex  items-center justify-center lg:justify-start gap-8 lg:gap-14 pt-2 border-t border-slate-100 w-full lg:w-fit">
                <div className="group cursor-default">
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 group-hover:text-accent transition-all duration-300">
                      99.8%
                    </p>
                    <span className="w-1 h-1 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] mt-1">
                    Avg. Purity
                  </p>
                </div>

                <div className="w-px h-12 bg-slate-100 rotate-[15deg]" />

                <div className="group cursor-default">
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 group-hover:text-accent transition-all duration-300">
                      24h
                    </p>
                    <span className="w-1 h-1 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] mt-1">
                    Dispatch Time
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Interactive Showcase - Visible on all devices */}
            <div className="relative group order-1 lg:order-2 w-full max-w-[500px] mx-auto lg:max-w-none">
              {/* Annotations - Desktop Only for clean mobile UI */}
              <div className="lg:block">
                <Annotation
                  number="1"
                  title="Advanced Cap"
                  desc="Self-sealing surgical grade rubber ensures zero contamination."
                  className="top-[15%] right-[35%]"
                  dotPosition="right"
                />
                <Annotation
                  number="2"
                  title="Vacuum Sealed"
                  desc="Molecular integrity preserved through precision lyophilization."
                  className="top-[40%] left-[35%]"
                  dotPosition="left"
                />
                <Annotation
                  number="3"
                  title="Lab Transparency"
                  desc="Unique batch identifiers for instant COA verification."
                  className="bottom-[35%] right-[40%]"
                  dotPosition="bottom"
                />
              </div>

              {/* The Container */}
              <div className="absolute inset-0 bg-accent/20 rounded-[3rem] lg:rounded-[5rem] blur-[60px] lg:blur-[120px] group-hover:bg-accent/30 transition-all duration-1000" />
              <div className="relative aspect-square lg:aspect-[5/5] bg-gradient-to-br from-white to-slate-100 rounded-[3rem] lg:rounded-[4rem] border border-white/50 shadow-2xl flex flex-col items-center justify-center p-6 lg:p-12 overflow-hidden">
                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent via-transparent to-transparent" />

                {/* Product Image */}
                <div className="relative w-full h-full flex items-center justify-center mb-4 lg:mb-8">
                  <div className="absolute w-[60%] h-[60%] bg-accent/20 blur-[80px] rounded-full animate-pulse" />
                  <div className="relative drop-shadow-[0_45px_45px_rgba(0,0,0,0.25)] animate-float z-10">
                    <Image
                      src="/product/product1.png"
                      width={1200}
                      height={1200}
                      alt="MetaPeptides Premium Vial"
                      className={cn(
                        "object-contain transition-transform duration-700 ease-out",
                        "scale-[1.25] rotate-[10deg]",
                        "lg:scale-[1.5] lg:rotate-[20deg]",
                        "group-hover:rotate-[5deg] group-hover:scale-[1.35] lg:group-hover:scale-[1.6]",
                      )}
                      priority
                    />
                  </div>
                </div>

                {/* Ref Box - Hidden on very small screens or made smaller */}
                <div className="w-full p-4 lg:p-6 backdrop-blur-xl bg-white/60 border border-white/40 rounded-2xl lg:rounded-[2.5rem] shadow-sm flex items-center justify-between">
                  <div className="space-y-0.5 lg:space-y-1">
                    <p className="text-[8px] lg:text-[10px] font-black text-accent uppercase tracking-widest">
                      Series Reference
                    </p>
                    <p className="text-sm lg:text-xl font-black text-slate-800 tracking-tighter uppercase italic">
                      Vial-X Core
                    </p>
                  </div>
                  <div className="p-2 lg:p-3 bg-accent text-white rounded-xl lg:rounded-2xl">
                    <FlaskConical className="w-4 h-4 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRUST TICKER */}
      <section className="border-y border-border bg-card/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              {
                label: "Purity Check",
                val: "≥99.0%",
                icon: <ShieldCheck className="w-5 h-5" />,
              },
              {
                label: "Logistics",
                val: "National",
                icon: <Globe2 className="w-5 h-5" />,
              },
              {
                label: "Secure Lab Pay",
                val: "Encrypted",
                icon: <Lock className="w-5 h-5" />,
              },
              {
                label: "Free Shipping",
                val: "All Indonesia",
                icon: <Truck className="w-5 h-5" />, // Pakai icon Truck lebih relevan untuk pengiriman
              },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="p-3 bg-accent/10 rounded-2xl text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                  {t.icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t.label}
                  </p>
                  <p className="text-base font-black tracking-tight">{t.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. BENEFITS */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div className="max-w-2xl space-y-4">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.85] uppercase">
                Redefining <br />{" "}
                <span className="text-accent italic">Research</span> Standards.
              </h2>
            </div>
            <Link
              href="/shop"
              className="group flex items-center gap-3 text-lg font-black uppercase tracking-tighter text-accent"
            >
              Browse Catalog{" "}
              <div className="p-2 border border-accent rounded-full group-hover:bg-accent group-hover:text-white transition-all">
                <ArrowRight className="w-5 h-5" />
              </div>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((item, i) => (
              <Card
                key={i}
                className="p-10 border-none bg-white shadow-xl shadow-slate-100/50 rounded-[3rem] group hover:bg-[#0F172A] transition-all duration-500 hover:-translate-y-2"
              >
                <div className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-10 group-hover:bg-accent group-hover:text-white transition-colors">
                  {item.icon && <item.icon className="w-6 h-6" />}
                </div>
                <h3 className="text-2xl font-black mb-4 group-hover:text-white transition-colors uppercase tracking-tight">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed group-hover:text-white/60 transition-colors">
                  {item.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ABOUT (Premium Dark) */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto bg-[#0F172A] rounded-[4rem] overflow-hidden relative shadow-2xl">
          {/* Decorative DNA Icon */}
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <Dna className="w-96 h-96 text-white rotate-45" />
          </div>

          <div className="grid lg:grid-cols-2 items-center p-12 md:p-24 gap-20 relative z-10">
            <div className="space-y-8">
              <div className="flex items-center gap-3 text-accent font-black text-[10px] uppercase tracking-[0.4em]">
                <span className="w-8 h-px bg-accent" />
                Domestic Research Excellence
              </div>
              <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.85]">
                INDONESIA'S <br />{" "}
                <span className="text-accent italic">PREMIER SOURCE.</span>
              </h2>
              <p className="text-white/70 text-lg leading-relaxed font-medium italic">
                MetaPeptides is the nation's definitive bridge between
                high-purity biochemistry and laboratory precision. We facilitate
                Indonesia's most demanding research through strictly audited
                synthetic sequences.
              </p>
              <Button className="bg-white text-black hover:bg-accent hover:text-white font-black rounded-2xl px-10 h-16 text-lg transition-all shadow-xl uppercase tracking-widest">
                Laboratory Standards
              </Button>
            </div>

            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 space-y-10">
              {GOLD_STANDARD_FEATURES.map((step, idx) => (
                <div key={idx} className="flex gap-6 group">
                  <div className="text-accent font-black text-2xl group-hover:scale-125 transition-transform">
                    {step.n}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1 uppercase tracking-tight">
                      {step.t}
                    </h4>
                    <p className="text-white/40 text-sm font-medium">
                      {step.d}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. FINAL CTA SECTION */}
      <section className="py-32 text-center px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-4xl md:text-6xl md:text-[100px] font-black tracking-tighter leading-[0.8] uppercase">
            Start Your <br />{" "}
            <span className="text-accent italic">Breakthrough.</span>
          </h2>
          <p className="text-xl text-muted-foreground font-medium max-w-xl mx-auto italic">
            Join 5,000+ facilities trusting MetaPeptides for high-precision
            synthetic compounds.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link href="/shop">
              <Button
                size="lg"
                className="h-20 px-16 rounded-[2rem] bg-accent hover:bg-accent/90 text-white font-black text-2xl shadow-[0_20px_50px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95"
              >
                Browse Shop
              </Button>
            </Link>
            <Link href="/faq">
              <Button
                size="lg"
                variant="outline"
                className="h-20 px-16 rounded-[2rem] border-2 font-black text-2xl transition-all hover:bg-muted/50"
              >
                View FAQ
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
