"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import {
  ShieldCheck,
  FlaskConical,
  Truck,
  Lock,
  FileSearch,
  CheckCircle2,
  ChevronRight,
  Headset,
} from "lucide-react";

export default function OurCompanyPageComponent() {
  const coreStrengths = [
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "Quality",
      description:
        "We partner with ISO 9001:2015 approved manufacturer to ensure the highest quality products available.",
    },
    {
      icon: <Truck className="w-6 h-6" />,
      title: "Safety Shipment",
      description:
        "Efficient domestic logistics and responsive support.",
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Transparent Value",
      description:
        "Providing transparent information for every products at competitive local prices without compromising integrity.",
    },
    {
      icon: <Headset className="w-6 h-6" />,
      title: "Full Support",
      description:
        "Comprehensive guidance and personalized support from the start of your journey until you fully reach your goals.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/20">
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-24 overflow-hidden bg-[#414042]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] -mr-40 -mt-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-black uppercase tracking-[0.2em]">
              Identity & Mission
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[0.85] uppercase">
              Our <br />
              <span className="text-accent italic">Company.</span>
            </h1>
            <p className="text-slate-400 text-xl font-medium leading-relaxed italic max-w-2xl">
              MetaPeptides is Indonesia&apos;s premier provider of research
              peptides, committed to uncompromising quality through partnerships
              with global certified sources.
            </p>
          </div>
        </div>
      </section>

      {/* --- PHILOSOPHY SECTION --- */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-16 items-stretch">
            <div className="lg:col-span-7 space-y-10">
              <div className="space-y-6">
                <h2 className="text-4xl font-black tracking-tighter uppercase italic border-l-4 border-accent pl-6">
                  Quality. Service. Value.
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {coreStrengths.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-8 rounded-[2rem] bg-muted/50 border border-border hover:border-accent/30 transition-colors"
                  >
                    <div className="text-accent mb-4">{item.icon}</div>
                    <h4 className="font-black uppercase tracking-tight mb-2">
                      {item.title}
                    </h4>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col h-full">
              <Card className="flex-1 p-10 bg-[#414042] border-none rounded-[3rem] relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8">
                  <img
                    src="/logo.webp"
                    alt="Logo Watermark"
                    className="w-80 h-80 object-contain"
                  />
                </div>
                <div className="relative z-10 space-y-12">
                  <h3 className="text-xl lg:text-2xl font-black text-white uppercase italic tracking-tight">
                    Brand Promise
                  </h3>
                  <p className="text-white/70 text-xs lg:text-sm leading-relaxed font-medium">
                    We are proud to be a trusted resource for the Indonesian
                    scientific community, providing high-purity compounds and professional assistance.
                    When you partner with us, you are never left to navigate your research alone—our expert
                    team offers comprehensive, personalized guidance and dedicated support every single step
                    of the way to guarantee you successfully reach your scientific goals.
                  </p>
                  <ul className="space-y-6">
                    {[
                      "Only serve the best",
                      "1-on-1 Personal Research Guide",
                      "100% Delivery & Reship Guarantee",
                      "COA Transparency",
                    ].map((list, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-4 text-white font-bold text-xs uppercase tracking-wider"
                      >
                        <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5 text-accent shrink-0" />
                        {list}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* --- RESEARCH COMMITMENT --- */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <FlaskConical className="w-16 h-16 text-accent mx-auto animate-pulse" />
            <h2 className="text-5xl font-black tracking-tighter uppercase leading-none">
              Empowering <br /> BIOHACKING RESEARCH.
            </h2>
            <p className="text-muted-foreground text-lg font-medium italic">
              MetaPeptides offers comprehensive resources to support the latest
              scientific publications and advance the local understanding of
              peptide applications.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="px-6 py-3 bg-white rounded-full border border-border flex items-center gap-3 shadow-sm">
                <FileSearch className="w-5 h-5 text-accent" />
                <span className="text-xs font-black uppercase tracking-widest">
                  Batch Analysis Reports
                </span>
              </div>
              <div className="px-6 py-3 bg-white rounded-full border border-border flex items-center gap-3 shadow-sm">
                <ShieldCheck className="w-5 h-5 text-accent" />
                <span className="text-xs font-black uppercase tracking-widest">
                  Verified Purity
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-32 text-center">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-6xl font-black tracking-tighter uppercase italic leading-none">
            Your Research <br />{" "}
            <span className="text-accent">Starts Here.</span>
          </h2>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link href="/shop">
              <Button className="h-16 px-12 rounded-2xl bg-accent hover:bg-accent/90 text-white font-black text-xl shadow-2xl shadow-accent/40 group">
                Shop Peptides{" "}
                <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
