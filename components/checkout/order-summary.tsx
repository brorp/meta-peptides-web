"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { ArrowRight, ShieldCheck, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useUserStore } from "@/store/useUserStore";
import { discount } from "@/contants/discount";

interface OrderSummaryProps {
  items: any[];
  subtotal: number;
  step: string;
  isLoading: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function OrderSummary({
  items,
  subtotal,
  step,
  isLoading,
  onNext,
  onBack,
}: OrderSummaryProps) {
  const { user } = useUserStore();
  const isMember = !!user && Object.keys(user).length > 0 && !user.isGuest;

  // 2. Only members get the discount
  const discountRate = isMember ? discount : 0;
  const discountAmount = subtotal * discountRate;
  const finalTotal = subtotal - discountAmount;

  return (
    <Card className="p-6 md:p-8 rounded-[2rem] border-none shadow-xl shadow-slate-200/50 sticky top-32 space-y-6 bg-white">
      {/* Title */}
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-lg font-bold tracking-tight text-slate-800">
          Order <span className="text-accent italic">Summary</span>
        </h3>
      </div>

      {/* Cart Items List */}
      <div className="space-y-4 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-start group">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700 leading-tight">
                {item.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Qty: {item.quantity}
                </span>
              </div>
            </div>
            <p className="font-semibold text-sm text-slate-900">
              {formatCurrency(item.price * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      {/* Pricing Breakdown */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-medium">Subtotal</span>
          <span className="font-bold text-slate-800">
            {formatCurrency(subtotal)}
          </span>
        </div>

        {/* Info Diskon Login */}
        {isMember ? (
          <div className="flex justify-between items-center text-sm animate-in fade-in slide-in-from-right-2">
            <div className="flex items-center gap-1.5 text-green-600">
              <Tag className="w-3 h-3" />
              <span className="font-medium">Member Discount (10%)</span>
            </div>
            <span className="text-[10px] font-black text-green-700 bg-green-50 px-2 py-1 rounded-lg">
              -{formatCurrency(discountAmount)}
            </span>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-[10px] text-slate-400 font-medium leading-tight">
              <Link
                href="/auth"
                className="text-accent font-bold hover:underline"
              >
                Login
              </Link>{" "}
              to get an automatic 10% discount on your research sequence.
            </p>
          </div>
        )}

        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500 font-medium">Shipping</span>
          <span className="text-[10px] font-bold text-accent bg-accent/5 px-2 py-1 rounded-lg italic">
            Free Dispatch
          </span>
        </div>

        {/* Grand Total */}
        <div className="flex justify-between items-end pt-5 border-t-2 border-dashed border-slate-100 mt-4">
          <span className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Total Due
          </span>
          <div className="text-right">
            {isMember && (
              <span className="block text-xs text-slate-400 line-through decoration-red-400/50 mb-0.5">
                {formatCurrency(subtotal)}
              </span>
            )}
            <span className="block text-2xl font-black text-accent tracking-tighter">
              {formatCurrency(finalTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 space-y-4">
        {step !== "Confirmation" && (
          <>
            <Button
              onClick={onNext}
              disabled={isLoading}
              className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-lg shadow-slate-200 group flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {step === "Payment" ? "Processing..." : "Verifying..."}
                </span>
              ) : (
                <>
                  {step === "Payment"
                    ? "Complete Transaction"
                    : "Proceed to Delivery"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            {step !== "Shipping" && (
              <button
                type="button"
                disabled={isLoading}
                onClick={onBack}
                className={cn(
                  "w-full text-xs font-bold uppercase tracking-widest transition-colors py-2",
                  isLoading
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                Go Back
              </button>
            )}
          </>
        )}
      </div>

      {/* Trust Badge */}
      <div className="flex items-center justify-center gap-2.5 pt-4 border-t border-slate-50 mt-2 opacity-50">
        <ShieldCheck className="w-4 h-4 text-slate-400" />
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Encrypted Research Order
        </span>
      </div>
    </Card>
  );
}
