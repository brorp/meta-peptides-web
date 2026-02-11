"use client";

import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";
import { ShoppingCart } from "lucide-react";

export function FloatingCart() {
  const { getCartCount, setIsCartOpen } = useCartStore();
  const count = getCartCount();

  return (
    <button
      onClick={() => setIsCartOpen(true)}
      className={cn(
        "fixed bottom-8 right-8 z-40 group transition-all duration-300 active:scale-95",
        "flex items-center justify-center w-16 h-16 rounded-full shadow-2xl bg-white border border-muted",
        "hover:shadow-accent/20 hover:border-accent/50",
      )}
    >
      {/* Badge Jumlah Barang */}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg animate-in zoom-in">
          {count}
        </span>
      )}

      {/* Icon */}
      <ShoppingCart className="w-7 h-7 text-foreground group-hover:scale-110 transition-transform duration-300" />

      {/* Efek Glow saat Hover */}
      <div className="absolute inset-0 rounded-full bg-accent/10 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
