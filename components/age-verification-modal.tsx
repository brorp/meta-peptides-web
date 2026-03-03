"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert } from "lucide-react";

interface AgeVerificationProps {
  onVerified: () => void;
}

export function AgeVerificationModal({ onVerified }: AgeVerificationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const isVerified = localStorage.getItem("metapeptides_age_verified");
    if (!isVerified) {
      setIsOpen(true);
    }
  }, []);

  const handleAgree = () => {
    if (rememberMe) {
      localStorage.setItem("metapeptides_age_verified", "true");
    }
    setIsOpen(false);

    // Kasih delay sedikit biar transisinya halus sebelum Promo muncul
    setTimeout(() => {
      onVerified();
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        isIconClose={false}
        className="w-[92vw] sm:max-w-[500px] p-8 bg-white rounded-[1.5rem] border-none shadow-2xl outline-none"
      >
        <DialogTitle className="sr-only">
          Age Verification & Disclaimer
        </DialogTitle>

        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo Placeholder - Metallic Style */}
          <div className="w-20 h-20 bg-[#414042] rounded-2xl flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-10 h-10 text-accent" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Age Verification
            </h2>
            <p className="text-lg font-medium text-slate-700">
              You must be at least 21 to visit this site.
            </p>
          </div>

          <p className="text-sm text-slate-500 leading-relaxed">
            By entering this site, you are acknowledging that you have read and
            agree to our
            <span className="text-accent font-bold cursor-pointer hover:underline ml-1">
              Terms of Service
            </span>
            .
          </p>

          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl font-bold border-slate-200"
              onClick={() => (window.location.href = "https://google.com")}
            >
              I Disagree
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl bg-[#414042] hover:bg-accent hover:text-black text-white font-bold transition-all"
              onClick={handleAgree}
            >
              I Agree
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <label
              htmlFor="remember"
              className="text-sm font-medium text-slate-600 cursor-pointer"
            >
              Remember me
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase leading-tight tracking-widest font-bold">
              Disclaimer: All products are strictly intended for laboratory
              research use only. Not approved for human or animal consumption.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
