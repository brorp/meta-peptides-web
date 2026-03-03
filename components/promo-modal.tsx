"use client";

import React from "react"; // Hapus useEffect yang tidak perlu di sini
import { X, ArrowRight, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { discount } from "@/contants/discount";

// Update Interface untuk menerima props
interface PromoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoModal({ open, onOpenChange }: PromoModalProps) {
  const router = useRouter();

  const handleClose = () => {
    onOpenChange(false);
    localStorage.setItem("metapeptides_promo_first_visit", "true");
  };

  const handleRedirect = () => {
    handleClose();
    router.push("/auth");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        isIconClose={false}
        className="z-[100] w-[92vw] sm:max-w-[450px] p-0 overflow-hidden border-none bg-transparent shadow-none outline-none"
      >
        <DialogTitle className="sr-only">Special Welcome Promo</DialogTitle>
        <div className="relative bg-white rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">
          {/* Header Metallic Gray */}
          <div className="h-24 sm:h-32 bg-[#414042] relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-full" />
            <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-accent animate-pulse" />
          </div>

          <div className="relative p-6 sm:p-8 flex flex-col items-center text-center">
            <button
              onClick={handleClose}
              className="absolute top-3 right-4 sm:top-4 sm:right-6 text-slate-400 hover:text-slate-600 transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 mb-6 sm:mb-8">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase">
                Special <br />
                <span className="text-accent italic">Welcome.</span>
              </h2>
              <p className="text-primary text-xs sm:text-sm font-medium px-2">
                Get{" "}
                <span className="text-slate-900 font-bold">
                  {discount * 100}% OFF
                </span>{" "}
                on your first order by creating an account today.
              </p>
            </div>

            <Button
              onClick={handleRedirect}
              className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-[#414042] hover:bg-accent hover:text-black text-white font-black uppercase tracking-widest text-[10px] sm:text-[11px] transition-all duration-300 group"
            >
              Sign Up & Claim Discount
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>

            <button
              onClick={handleClose}
              className="mt-5 sm:mt-6 text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-widest hover:text-slate-600 transition-colors py-2"
            >
              Maybe later, I'll browse first
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
