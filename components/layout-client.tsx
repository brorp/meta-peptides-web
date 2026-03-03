"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { FloatingActions } from "@/components/floating-cart";
import { Footer } from "./footer";
import { GlobalCart } from "./global-cart";
import { useUserStore } from "@/store/useUserStore";
import { createClientComponentClient } from "@/lib/supabase-client";
import { PromoModal } from "./promo-modal";
import OneModal from "./one-modal";

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);

  useEffect(() => {
    const {
      data: { subscription },
    } = createClientComponentClient().auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          clearUser();
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [createClientComponentClient(), setUser, clearUser]);

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <OneModal />
      <FloatingActions />
      <Footer />
      <GlobalCart />
    </>
  );
}
