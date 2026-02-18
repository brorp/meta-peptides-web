"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Camera,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface ConfirmationCardProps {
  data: any;
}

export function ConfirmationCard({ data }: ConfirmationCardProps) {
  const transactionCode = data?.data?.transaction_code || "MP-PROCESSING";

  const handleScreenshot = () => {
    window.print();
  };

  return (
    <Card className="p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border-accent/20 bg-white shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl" />

      <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <ShieldCheck className="w-10 h-10 text-accent" />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl md:text-4xl font-bold uppercase italic tracking-tighter text-slate-900">
          Order <span className="text-accent">Received.</span>
          <p className="text-accent font-black text-xs uppercase tracking-[0.2em]">
            Thank you for your trust.
          </p>
        </h2>
        <p className="text-slate-500 text-sm font-medium max-w-sm mx-auto leading-relaxed">
          Your payment is being verified. Your order will be
          <span className="text-slate-900 font-bold italic">
            {" "}
            processed and dispatched 1 - 3 hours{" "}
          </span>
          once approved.
        </p>
      </div>

      <div className="group relative bg-slate-50 border border-slate-100 p-4 rounded-2xl max-w-xs mx-auto transition-all hover:border-accent/20">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
          Order Reference
        </p>
        <div className="font-mono text-sm uppercase tracking-wider font-bold text-slate-700">
          #{transactionCode}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 py-2 px-4 rounded-full w-fit mx-auto border border-amber-100">
        <Clock className="w-3 h-3 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          Awaiting Admin Verification
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-left border-t border-slate-100 pt-8 mt-4">
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Dispatch ETA
          </p>
          <p className="text-xs font-bold text-slate-800">
            1 - 3 Hours After Verification
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Tracking Status
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-xs font-bold text-slate-800">
              Queued for Review
            </p>
          </div>
        </div>
      </div>

      <div className="pt-6 space-y-3">
        <Link href="/shop" className="block">
          <Button className="w-full py-7 rounded-2xl bg-[#0F172A] text-white font-bold uppercase tracking-widest hover:bg-accent hover:text-black transition-all duration-300 shadow-xl shadow-slate-200 group">
            Return to Shopping
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>

      <p className="text-[9px] text-slate-400 font-medium pt-4 border-t border-slate-50">
        Our team manually verifies every QRIS transaction to ensure laboratory
        standards. A confirmation email will be sent to your inbox shortly.
      </p>
    </Card>
  );
}
