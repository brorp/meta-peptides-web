"use client";

import { useCartStore } from "@/store/useCartStore";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, X, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function GlobalCart() {
  const router = useRouter();
  const {
    items: cartProducts,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    getCartCount,
    getTotalPrice,
  } = useCartStore();

  const cartTotal = getTotalPrice();

  const handleCheckout = async (e: React.MouseEvent) => {
    e.preventDefault();

    setIsCartOpen(false);
    router.push("/checkout");
  };

  return (
    <Drawer open={isCartOpen} onOpenChange={setIsCartOpen}>
      <DrawerContent className="max-w-md mx-auto rounded-t-[2rem] border-none bg-white">
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-200 my-4" />

        <DrawerHeader className="px-6 pb-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <DrawerTitle className="text-2xl font-bold tracking-tight text-slate-800">
                Cart <span className="text-accent italic">Details.</span>
              </DrawerTitle>
              <DrawerDescription className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                {getCartCount()} Sequences in your lab
              </DrawerDescription>
            </div>
            <DrawerClose className="rounded-full p-2 bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors">
              <X className="h-4 w-4" />
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* List Item Keranjang */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3 max-h-[50vh] custom-scrollbar">
          {cartProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-sm font-semibold text-slate-400">
                Your research cart is empty.
              </p>
              <Link href="/shop" onClick={() => setIsCartOpen(false)}>
                <Button
                  variant="link"
                  className="text-accent text-xs font-bold uppercase tracking-widest mt-2"
                >
                  Browse Products
                </Button>
              </Link>
            </div>
          ) : (
            cartProducts.map((product) => (
              <div
                key={product.id}
                className="group p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-accent/20 hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300"
              >
                <div className="flex gap-4">
                  {/* Thumbnail / Icon */}
                  <div className="relative w-20 h-20 bg-white rounded-2xl border border-slate-100 flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform overflow-hidden p-2">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-contain p-2"
                        sizes="80px"
                        priority={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-50 flex items-center justify-center text-xl">
                        🧬
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm text-slate-800 leading-none">
                        {product.name}
                      </h3>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                      {product.volume} • {product.purity}
                    </p>

                    <div className="flex justify-between items-end pt-1">
                      <span className="font-bold text-sm text-accent">
                        {formatCurrency(product.price * product.quantity)}
                      </span>

                      {/* Premium Quantity Controls */}
                      <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg p-1 shadow-sm">
                        <button
                          onClick={() =>
                            updateQuantity(product.id, product.quantity - 1)
                          }
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-50 text-slate-400 hover:text-accent transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[11px] font-black text-slate-700 min-w-[1rem] text-center">
                          {product.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(product.id, product.quantity + 1)
                          }
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-50 text-slate-400 hover:text-accent transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Drawer */}
        <DrawerFooter className="px-6 py-8 bg-white border-t border-slate-50">
          {cartProducts.length > 0 ? (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Estimated Total
                  </span>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">
                    {formatCurrency(cartTotal)}
                  </p>
                </div>
                <div className="pb-1">
                  <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">
                    Secure Check
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-slate-900 hover:bg-accent text-white h-14 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-slate-200 group flex items-center justify-center gap-2"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <DrawerClose asChild>
                  <Button
                    variant="ghost"
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                  >
                    Continue Researching
                  </Button>
                </DrawerClose>
              </div>

              <p className="text-[9px] text-center text-slate-300 font-medium uppercase tracking-[0.3em]">
                MetaPeptides Laboratory Sequence System
              </p>
            </div>
          ) : (
            <Button
              onClick={() => setIsCartOpen(false)}
              className="w-full bg-slate-100 text-slate-500 h-14 rounded-2xl font-bold"
            >
              Close Cart
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
