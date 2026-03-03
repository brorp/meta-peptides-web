"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Dna, ArrowLeft, Search, FlaskConical, Microscope } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen pt-32 bg-background text-foreground selection:bg-accent/30 font-sans antialiased overflow-hidden flex items-center justify-center">
      {/* --- Background Dynamic Ornaments --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[140px]" />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] bg-[grid:1fr_1fr]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl px-6 text-center">
        {/* --- 404 Visual --- */}
        <div className="relative flex justify-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <h1 className="text-[14rem] lg:text-[18rem] font-black leading-none tracking-tighter italic opacity-[0.04] select-none text-accent">
              404
            </h1>

            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-36 h-36 bg-foreground rounded-[2.8rem] flex items-center justify-center shadow-2xl shadow-accent/20 border border-accent/30"
              >
                <Microscope className="w-16 h-16 text-background" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* --- Text Content --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-[10px] font-black uppercase tracking-[0.3em] text-accent dark:text-accent">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Error 404: Path Invalid
          </div>

          <h2 className="text-4xl lg:text-6xl font-black tracking-tighter uppercase italic leading-tight">
            PAGE <span className="text-accent">LOST.</span>
          </h2>

          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed font-medium uppercase tracking-widest">
            The page you are looking for does not exist or has been moved to a
            different sector. Please return to the{" "}
            <span className="text-foreground font-bold underline">Home</span> or
            contact our support.
          </p>
        </motion.div>

        {/* --- Buttons --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-5"
        >
          <Button
            asChild
            className="h-16 px-10 bg-accent hover:bg-accent text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl shadow-accent/20 transition-all active:scale-[0.95] min-w-[240px]"
          >
            <Link href="/" className="flex items-center gap-3">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
        </motion.div>

        {/* --- Footer --- */}
        <div className="mt-20 pt-10 border-t border-border/30 max-w-xs mx-auto">
          <div className="flex items-center justify-center gap-4 opacity-40">
            <FlaskConical className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">
              System Node: Error_0404
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
