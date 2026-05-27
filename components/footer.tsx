"use client";

import Link from "next/link";
import { NAV_LINKS } from "./navbar";
import { email } from "@/contants/contact";

export function Footer() {
  return (
    <footer className="bg-[#414042] text-primary-foreground border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8 text-center items-start">

          {/* Grouped columns: Quick Links & Legal + Inquiries (2 columns on mobile, 2 columns on desktop) */}
          <div className="grid grid-cols-2 gap-8 col-span-2 md:col-span-2">
            <div className="flex flex-col items-center text-center">
              <h4 className="font-bold mb-4 text-white">Explore</h4>
              <ul className="space-y-2 text-sm opacity-70 flex flex-col items-center text-center">
                {NAV_LINKS.map((link, i) => {
                  return (
                    <li key={i}>
                      <Link
                        href={link.href}
                        className="hover:opacity-100 hover:text-accent transition"
                      >
                        {link.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex flex-col items-center text-center">
              <h4 className="font-bold mb-4 text-white">Legal</h4>
              <ul className="space-y-2 text-sm opacity-70 mb-6 flex flex-col items-center text-center">
                <li>
                  <Link href="/tnc" className="hover:opacity-100 transition">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/shipping" className="hover:opacity-100 transition">
                    Shipping Policy
                  </Link>
                </li>
              </ul>

              <h4 className="font-bold mb-4 text-white">Inquiries</h4>
              <p className="text-sm font-medium text-center">{email}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center text-xs opacity-60">
          <p>
            © {new Date().getFullYear()} MetaPeptides. All Rights Reserved. For
            research purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
