"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Box,
  Droplets,
  Syringe,
  ShieldCheck,
  ArrowRight,
  Zap,
  Package,
} from "lucide-react";
import Link from "next/link";

export default function PeptidesGuidesComponent() {
  const kitItems = [
    { name: "1pc Vial Peptide", desc: "Lypo Powder", icon: <Box size={16} /> },
    {
      name: "1pc Bac Water",
      desc: "Sterile Solvent",
      icon: <Droplets size={16} />,
    },
    {
      name: "1pc 3mL Syringe",
      desc: "For Reconstitution",
      icon: <Syringe size={16} />,
    },
    {
      name: "10pcs 0.5mL Syringe",
      desc: "Precise Dosing",
      icon: <ShieldCheck size={16} />,
    },
  ];

  const usageSteps = [
    { id: "01", title: "Sanitization", body: "Isopropyl alcohol protocol." },
    { id: "02", title: "Concentration", body: "Target mg/mL calculation." },
    { id: "03", title: "Reconstitution", body: "Slow-drip vial mixing." },
    { id: "04", title: "Dosing", body: "Precise unit measurement." },
    { id: "05", title: "Injection", body: "Subcutaneous research protocol." },
    { id: "06", title: "Storage", body: "2°C – 8°C light protection." },
  ];

  return (
    <div className="min-h-screen bg-background selection:bg-accent/30">
      {/* --- HERO SECTION --- */}
      <section className="relative pt-24 pb-12 overflow-hidden bg-[#0F172A]"></section>

      {/* --- CONTENT SECTION --- */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-20">
          {/* 1. Unboxing Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <Package className="text-accent" size={20} />
                <h2 className="text-xl font-black uppercase tracking-tight italic">
                  Research <span className="text-accent">Starter Kit.</span>
                </h2>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden md:block">
                Domestic Logistics Only
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kitItems.map((item, i) => (
                <div
                  key={i}
                  className="group p-4 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-500 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase leading-none tracking-tight">
                      {item.name}
                    </h4>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Core Protocols */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <Zap className="text-accent" size={20} />
                <h2 className="text-xl font-black uppercase tracking-tight italic">
                  Technical <span className="text-accent">SOP.</span>
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
              {usageSteps.map((step) => (
                <div
                  key={step.id}
                  className="relative flex flex-col gap-2 group"
                >
                  <div className="text-xs font-black text-accent/30 tracking-widest group-hover:text-accent transition-colors">
                    [{step.id}]
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase italic tracking-tighter flex items-center gap-2">
                      {step.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-wider">
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Footer CTA */}
          <div className="text-center py-10 border-t border-border/50 space-y-6">
            <h4 className="text-2xl font-black uppercase italic tracking-tighter">
              Ready to Advance Your Research?
            </h4>
            <p className="text-muted-foreground text-[10px] uppercase tracking-[0.3em] font-bold">
              MetaPeptides &bull; Indonesia Domestic Logistics Only
            </p>
            <Link href="/shop" className="inline-block pt-2">
              <Button className="h-12 px-10 bg-accent hover:bg-accent/80 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-accent/20">
                Shop All Products <ArrowRight className="ml-2" size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
