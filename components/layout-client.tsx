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
import { usePathname } from "next/navigation";

export function LayoutClient({
  children,
  storefrontFontClassName,
}: {
  children: React.ReactNode;
  storefrontFontClassName: string;
}) {
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);
  const pathname = usePathname();
  const isCampaignLanding =
    pathname === "/free-consultation" || pathname.startsWith("/ads/");

  useEffect(() => {
    document.body.classList.add(storefrontFontClassName);
    return () => document.body.classList.remove(storefrontFontClassName);
  }, [storefrontFontClassName]);

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
    <div className={`storefront-shell ${storefrontFontClassName}`}>
      {!isCampaignLanding && <Navbar />}
      <main>{children}</main>
      {!isCampaignLanding && <OneModal />}
      {!isCampaignLanding && <FloatingActions />}
      {!isCampaignLanding && <Footer />}
      {!isCampaignLanding && <GlobalCart />}
    </div>
  );
}
