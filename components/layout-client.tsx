"use client";

import { Navbar } from "@/components/navbar";
import { FloatingCart } from "@/components/floating-cart";
import { Footer } from "./footer";
import { GlobalCart } from "./global-cart";

export function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <FloatingCart />
      <Footer />
      <GlobalCart />
    </>
  );
}
