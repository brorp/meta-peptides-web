"use client";

import React from "react";
import {
  ShieldCheck,
  Truck,
  Clock,
  AlertCircle,
  MapPin,
  ChevronRight,
  Info,
} from "lucide-react";

export default function ShippingPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 selection:bg-accent/30">
      <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        {/* HEADER SECTION */}
        <div className="bg-[#414042] p-10 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full -mr-32 -mt-32" />
          <div className="relative z-10 space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter">
              Shipping <span className="text-accent italic">Policy</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-[0.3em]">
              Meta Peptides Binding Terms
            </p>
          </div>
        </div>

        {/* INTRODUCTION */}
        <div className="px-8 sm:px-16 pt-12">
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4 items-start">
            <Info className="w-5 h-5 text-[#414042] mt-1 flex-shrink-0" />
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              By placing an order with Meta Peptides, you expressly acknowledge,
              understand, and agree to the following binding shipping terms:
            </p>
          </div>
        </div>

        {/* MAIN CONTENT SECTION */}
        <div className="p-8 sm:p-16 space-y-16">
          {/* 1. NO REFUND */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                1. No Refund / No Cancellation Policy
              </h2>
            </div>
            <div className="pl-14 space-y-4">
              <p className="text-slate-900 font-black uppercase text-sm decoration-red-500 underline underline-offset-4">
                All purchases are final.
              </p>
              <p className="text-slate-600 leading-relaxed">
                We operate under a strict no-refund, no-return, and
                no-cancellation policy once an order has been placed and payment
                has been confirmed.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Refunds, exchanges, or cancellations will not be granted for any
                reason, including but not limited to:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "Change of mind",
                  "Incorrect product selection",
                  "Delayed delivery",
                  "Carrier issues",
                  "Customer availability",
                  "Address errors",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-[11px] font-black text-slate-700 uppercase tracking-wide bg-slate-50 p-3 rounded-lg border border-slate-100"
                  >
                    <ChevronRight className="w-3 h-3 text-red-500" />
                    {item}
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold text-slate-500 italic bg-[#414042]/5 p-4 rounded-xl border-l-4 border-[#414042]">
                Customers are solely responsible for reviewing their order
                details prior to payment.
              </p>
            </div>
          </section>

          {/* 2. SHIPPING COVERAGE */}
          <section className="space-y-4 border-t border-slate-100 pt-12">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                <MapPin className="w-5 h-5 text-[#414042]" />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                2. Shipping Coverage
              </h2>
            </div>
            <div className="pl-14 space-y-4 text-slate-600 leading-relaxed">
              <p>
                We ship exclusively within Indonesia. Orders requesting delivery
                outside Indonesia will not be processed.
              </p>
              <p>
                Delivery availability is subject to courier service coverage and
                operational limitations.
              </p>
            </div>
          </section>

          {/* 3. ORDER PROCESSING */}
          <section className="space-y-4 border-t border-slate-100 pt-12">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                <Clock className="w-5 h-5 text-[#414042]" />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                3. Order Processing & Dispatch Schedule
              </h2>
            </div>
            <div className="pl-14 space-y-4 text-slate-600 leading-relaxed">
              <p>
                Orders are processed and dispatched daily between{" "}
                <strong>09.00 – 18.00 (Western Indonesia Time)</strong> on
                business days.
              </p>
              <ul className="space-y-2 text-sm font-medium">
                <li className="flex items-start gap-2">
                  •{" "}
                  <span>
                    Orders placed outside operational hours may be processed the
                    next business day
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  • <span>Dispatch times are estimates, not guarantees</span>
                </li>
                <li className="flex items-start gap-2">
                  •{" "}
                  <span>
                    We reserve the right to delay shipment for verification,
                    stock control, compliance checks, or operational reasons
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* 4. DELIVERY TIME */}
          <section className="space-y-4 border-t border-slate-100 pt-12">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                <Truck className="w-5 h-5 text-[#414042]" />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                4. Delivery Time & Carrier Responsibility
              </h2>
            </div>
            <div className="pl-14 space-y-4 text-slate-600 leading-relaxed">
              <p>
                All delivery timelines are non-binding estimates provided by
                third-party couriers.
              </p>
              <p>Meta Peptides bears no liability for:</p>
              <div className="bg-slate-50 p-6 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-black uppercase tracking-widest text-slate-700">
                <span>• Shipping delays</span>
                <span>• Delivery failures</span>
                <span>• Lost or mishandled packages</span>
                <span>• Courier errors</span>
                <span className="col-span-full">• Force majeure events</span>
              </div>
              <p>
                Once the shipment has been transferred to the courier, all
                transit risks pass to the customer.
              </p>
            </div>
          </section>

          {/* 5. ADDRESS ACCURACY */}
          <section className="space-y-4 border-t border-slate-100 pt-12">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                <ShieldCheck className="w-5 h-5 text-[#414042]" />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                5. Address Accuracy & Delivery Failures
              </h2>
            </div>
            <div className="pl-14 space-y-4 text-slate-600 leading-relaxed">
              <p>
                Customers are fully responsible for providing accurate and
                complete shipping information.
              </p>
              <p>
                Meta Peptides is not responsible for failed deliveries caused
                by:
              </p>
              <ul className="space-y-1 text-sm font-bold text-slate-800 ml-4">
                <li>• Incorrect addresses</li>
                <li>• Recipient unavailability</li>
                <li>• Refused deliveries</li>
                <li>• Courier access limitations</li>
              </ul>
              <p>
                Reshipment, if approved, may incur additional charges at the
                customer’s expense.
              </p>
            </div>
          </section>

          {/* 6. EXCEPTIONAL CIRCUMSTANCES */}
          <section className="space-y-4 border-t border-slate-100 pt-12">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                6. Exceptional Circumstances
              </h2>
            </div>
            <div className="pl-14 space-y-4 text-slate-600 leading-relaxed">
              <p>Meta Peptides reserves the absolute right to:</p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-black uppercase tracking-tighter text-slate-900">
                <li>• Refuse shipment</li>
                <li>• Delay dispatch</li>
                <li>• Cancel fulfillment</li>
                <li>• Restrict delivery</li>
              </ul>
              <p>
                without obligation to refund or compensate, particularly in
                cases involving regulatory concerns, safety issues, suspected
                misuse, or operational risks.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
