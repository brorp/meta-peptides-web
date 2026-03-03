"use client";

import React from "react";
import {
  Gavel,
  FlaskConical,
  Stethoscope,
  UserCheck,
  CreditCard,
  ShieldAlert,
  Scale,
  Copyright,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 selection:bg-accent/30">
      <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        {/* HEADER SECTION */}
        <div className="bg-[#414042] p-10 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full -ml-32 -mt-32" />
          <div className="relative z-10 space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter">
              Terms & <span className="text-accent italic">Conditions</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-[0.3em]">
              Meta Peptides Legal Framework
            </p>
          </div>
        </div>

        {/* INTRODUCTION */}
        <div className="px-8 sm:px-16 pt-12">
          <div className="p-8 bg-slate-900 rounded-[2rem] border border-white/10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Gavel className="w-20 h-20" />
            </div>
            <p className="relative z-10 text-sm sm:text-base leading-relaxed font-medium">
              By creating an account on Meta Peptides, you acknowledge that you
              have read, understood, and agreed to be legally bound by the
              following Terms & Conditions.
            </p>
            <p className="relative z-10 mt-4 text-accent font-black text-xs uppercase tracking-widest">
              If you do not agree, you must not register or use this website.
            </p>
          </div>
        </div>

        {/* MAIN CONTENT SECTION */}
        <div className="p-8 sm:p-16 space-y-16">
          {/* 1. ELIGIBILITY */}
          <TNCSection icon={<UserCheck />} title="1. Eligibility">
            <p>By registering, you confirm that:</p>
            <ul className="space-y-2 mt-4 ml-2">
              <li className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold uppercase tracking-tight text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" /> You are
                at least 18 years old.
              </li>
              <li className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold uppercase tracking-tight text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" /> You have
                full legal capacity under the laws of Indonesia.
              </li>
              <li className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold uppercase tracking-tight text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" /> You are
                registering under your true identity.
              </li>
              <li className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold uppercase tracking-tight text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" /> You will
                not use this website for unlawful purposes.
              </li>
            </ul>
            <p className="mt-4 text-xs italic text-slate-500 font-bold uppercase tracking-tighter">
              Meta Peptides reserves the right to suspend or terminate accounts
              at its sole discretion without prior notice.
            </p>
          </TNCSection>

          {/* 2. NATURE OF PRODUCTS */}
          <TNCSection icon={<FlaskConical />} title="2. Nature of Products">
            <p>All products sold on this website are intended strictly for:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              {[
                "Research purposes",
                "Laboratory use",
                "Scientific investigation",
              ].map((item) => (
                <div
                  key={item}
                  className="p-3 bg-slate-900 text-white rounded-xl text-center text-[10px] font-black uppercase tracking-widest"
                >
                  {item}
                </div>
              ))}
            </div>
            <p>
              Products are not intended for human consumption, medical use,
              diagnosis, treatment, or prevention of disease unless explicitly
              stated and compliant with applicable regulations.
            </p>
            <p className="font-bold text-slate-900 underline decoration-accent underline-offset-4 mt-2">
              You agree that you understand the nature of the products and
              assume full responsibility for their use.
            </p>
          </TNCSection>

          {/* 3. NO MEDICAL ADVICE */}
          <TNCSection icon={<Stethoscope />} title="3. No Medical Advice">
            <p>The information provided on this website:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm ml-4">
              <li>Is for informational purposes only</li>
              <li>Does not constitute medical advice</li>
              <li>
                Should not replace consultation with licensed healthcare
                professionals
              </li>
            </ul>
            <p className="mt-4 font-bold text-slate-800">
              Meta Peptides makes no medical claims regarding product
              effectiveness or safety.
            </p>
          </TNCSection>

          {/* 4. ACCOUNT RESPONSIBILITY */}
          <TNCSection icon={<ShieldAlert />} title="4. Account Responsibility">
            <p>You are fully responsible for:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm ml-4 font-medium">
              <li>Maintaining confidentiality of your login credentials</li>
              <li>All activities conducted under your account</li>
              <li>Ensuring accurate information at registration</li>
            </ul>
            <p className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100 uppercase tracking-tight">
              Meta Peptides is not liable for unauthorized account access
              resulting from your negligence.
            </p>
          </TNCSection>

          {/* 5. ORDERS & PAYMENTS */}
          <TNCSection icon={<CreditCard />} title="5. Orders & Payments">
            <p className="font-black text-slate-900 uppercase tracking-tighter text-lg">
              All purchases are final.
            </p>
            <p className="italic font-bold text-red-600 mb-4">
              We operate under a strict no-refund, no-return policy.
            </p>
            <p>
              We reserve the right to reject any order, cancel transactions,
              limit quantities, or refuse service without obligation to provide
              explanation.
            </p>
          </TNCSection>

          {/* 6. SHIPPING & RISK TRANSFER */}
          <TNCSection icon={<RefreshCcw />} title="6. Shipping & Risk Transfer">
            <p>By placing an order, you agree that:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm ml-4">
              <li>Shipping is limited to Indonesia</li>
              <li>
                Dispatch occurs during operational hours (09.00–18.00 WIB)
              </li>
              <li>Risk transfers to the customer once handed to courier</li>
            </ul>
            <p className="mt-2">
              Meta Peptides is not responsible for shipping delays or
              carrier-related issues.
            </p>
          </TNCSection>

          {/* 7. LIMITATION OF LIABILITY */}
          <TNCSection icon={<Scale />} title="7. Limitation of Liability">
            <p className="text-xs font-black uppercase text-slate-400 mb-2 tracking-[0.2em]">
              To the maximum extent permitted by law:
            </p>
            <p>
              Meta Peptides shall not be liable for direct or indirect damages,
              consequential losses, loss of profits, health-related claims, or
              misuse of products.
            </p>
            <p className="mt-4 font-black text-slate-900 uppercase decoration-accent underline underline-offset-4">
              All risks associated with product handling and use are assumed by
              the customer.
            </p>
          </TNCSection>

          {/* 8. INDEMNIFICATION */}
          <TNCSection icon={<AlertTriangle />} title="8. Indemnification">
            <p>
              You agree to indemnify and hold harmless Meta Peptides, its
              owners, affiliates, employees, and partners from any claims,
              liabilities, damages, legal costs, or disputes arising from:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-xs font-bold text-slate-700 uppercase tracking-tight ml-4">
              <li>Your misuse of products</li>
              <li>Violation of these Terms</li>
              <li>Breach of applicable laws</li>
            </ul>
          </TNCSection>

          {/* 9. INTELLECTUAL PROPERTY */}
          <TNCSection icon={<Copyright />} title="9. Intellectual Property">
            <p>
              All content on this website including logos, branding,
              copywriting, product descriptions, and design elements are the
              exclusive property of Meta Peptides and may not be reproduced
              without written consent.
            </p>
          </TNCSection>

          {/* 10. MODIFICATION OF TERMS */}
          <TNCSection icon={<RefreshCcw />} title="10. Modification of Terms">
            <p>
              Meta Peptides reserves the right to modify these Terms &
              Conditions at any time without prior notice. Continued use of the
              website constitutes acceptance of the updated terms.
            </p>
          </TNCSection>

          {/* 11. GOVERNING LAW */}
          <TNCSection icon={<Gavel />} title="11. Governing Law">
            <p>
              These Terms shall be governed by and interpreted in accordance
              with the laws of the Republic of Indonesia. Any disputes shall be
              resolved under Indonesian jurisdiction.
            </p>
          </TNCSection>

          {/* REGISTER AGREEMENT SECTION */}
          <div className="mt-20 p-8 sm:p-12 rounded-[2.5rem] bg-[#414042] text-white relative overflow-hidden group border border-white/10 shadow-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-accent flex items-center gap-3">
              <span className="w-10 h-px bg-accent" />
              Register Agreement Checkbox
            </h3>

            <div className="flex items-start gap-6 bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-sm relative z-10">
              <div className="w-7 h-7 rounded-xl border-2 border-accent flex-shrink-0 mt-1 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-accent rounded-sm" />
              </div>
              <p className="text-slate-300 text-sm leading-relaxed font-medium italic">
                I confirm that I am at least 18 years old and have read,
                understood, and agreed to the{" "}
                <span className="text-white font-black underline decoration-accent decoration-2 underline-offset-4">
                  Terms & Conditions
                </span>
                , including product use limitations and no-refund policy.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-12 pb-8">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em]">
          Momenku Brand - Meta Peptides 2026
        </p>
      </div>
    </main>
  );
}

// Sub-komponen untuk menjaga kerapian struktur (Teks tetap utuh)
function TNCSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-slate-100 pt-12 first:border-t-0 first:pt-0 group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 text-[#414042] group-hover:bg-accent group-hover:text-white transition-all duration-300">
          {React.cloneElement(icon as React.ReactElement<any>, {
            className: "w-5 h-5",
          })}
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
          {title}
        </h2>
      </div>
      <div className="pl-14 text-slate-600 leading-relaxed text-sm font-medium">
        {children}
      </div>
    </section>
  );
}
