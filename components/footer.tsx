"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="MetaPeptides" className="h-8 w-auto" />
              <span className="font-bold text-xl tracking-tight">
                metapeptides
              </span>
            </div>
            <p className="text-sm opacity-70 leading-relaxed">
              Premium research peptides for scientific advancement. We provide
              verified compounds for laboratory use.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li>
                <Link
                  href="/"
                  className="hover:opacity-100 hover:text-accent transition"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/shop"
                  className="hover:opacity-100 hover:text-accent transition"
                >
                  Shop
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:opacity-100 hover:text-accent transition"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:opacity-100 hover:text-accent transition"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li>
                <Link href="/terms" className="hover:opacity-100 transition">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:opacity-100 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:opacity-100 transition">
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Get in Touch</h4>
            <p className="text-sm opacity-70 mb-2">Questions or support?</p>
            <p className="text-sm font-medium">support@metapeptides.com</p>
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
