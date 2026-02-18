"use client";

import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";
import { ShoppingCart, MessageCircle, Phone } from "lucide-react";

export function FloatingActions() {
  const { getCartCount, setIsCartOpen } = useCartStore();
  const count = getCartCount();

  const whatsappNumber = "628123456789"; // Ganti dengan nomor WA MetaPeptides
  const message = "Halo MetaPeptides, saya ingin bertanya tentang produk...";

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  return (
    <div className="fixed bottom-8 right-8 z-40 flex flex-col gap-4">
      {/*  WhatsApp */}
      <button
        onClick={openWhatsApp}
        className={cn(
          "relative group transition-all duration-300 active:scale-95",
          "flex items-center justify-center w-16 h-16 rounded-full shadow-xl bg-[#25D366] border border-white/20",
          "hover:shadow-[#25D366]/40 hover:scale-110",
        )}
      >
        {/* WhatsApp SVG Icon */}
        <svg
          viewBox="0 0 24 24"
          className="w-7 h-7 fill-white group-hover:rotate-12 transition-transform duration-300"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.445 0 .01 5.437 0 12.045c0 2.112.552 4.171 1.597 6.01L0 24l6.117-1.604a11.845 11.845 0 005.926 1.584h.005c6.605 0 12.039-5.436 12.04-12.045a11.85 11.85 0 00-3.559-8.521" />
        </svg>

        {/* Tooltip Label */}
        <span className="absolute right-16 px-3 py-1 bg-black/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-2xl">
          WhatsApp
        </span>

        {/* Notification PING (Optional: biar makin eye-catching) */}
        <span className="absolute top-0 right-0 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500/20"></span>
        </span>
      </button>

      {/*  Cart */}
      <button
        onClick={() => setIsCartOpen(true)}
        className={cn(
          "relative group transition-all duration-300 active:scale-95",
          "flex items-center justify-center w-16 h-16 rounded-full shadow-2xl bg-white border border-muted",
          "hover:shadow-accent/20 hover:border-accent/50 hover:scale-105",
        )}
      >
        {/* Badge Jumlah Barang */}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg animate-in zoom-in">
            {count}
          </span>
        )}

        <ShoppingCart className="w-7 h-7 text-foreground group-hover:scale-110 transition-transform duration-300" />

        {/* Efek Glow saat Hover */}
        <div className="absolute inset-0 rounded-full bg-accent/10 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );
}
