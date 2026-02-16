"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { FloatingCart } from "@/components/floating-cart";
import { Footer } from "./footer";
import { GlobalCart } from "./global-cart";
import { useUserStore } from "@/store/useUserStore";
import { supabaseClient } from "@/lib/supabase-client";

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        clearUser();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient, setUser, clearUser]);

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
