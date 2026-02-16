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
import { Card } from "@/components/ui/card";
import { ShoppingCart, Plus, Minus, X } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { products } from "@/contants/product";

export function GlobalCart() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    getCartCount,
  } = useCartStore();

  const cartProducts = Object.entries(cart)
    .map(([id, qty]) => ({
      product: products.find((p) => p.id === Number(id)),
      qty,
    }))
    .filter((item) => item.product !== undefined);

  const cartTotal = cartProducts.reduce((sum, item) => {
    return sum + (item.product?.price || 0) * item.qty;
  }, 0);

  return (
    <Drawer open={isCartOpen} onOpenChange={setIsCartOpen}>
      <DrawerContent className="w-full max-w-md mx-auto">
        <DrawerHeader className="flex justify-between items-start border-b pb-4">
          <div>
            <DrawerTitle className="text-xl">Your Research Cart</DrawerTitle>
            <DrawerDescription>
              You have {getCartCount()} items in your cart
            </DrawerDescription>
          </div>
          <DrawerClose className="rounded-full p-2 hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </DrawerClose>
        </DrawerHeader>

        {/* List Item Keranjang */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 max-h-[60vh]">
          {cartProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
              <p>Your cart is currently empty.</p>
            </div>
          ) : (
            cartProducts.map(({ product, qty }) => (
              <Card
                key={product!.id}
                className="p-4 border border-border shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-accent/10 rounded-lg flex items-center justify-center text-2xl">
                    🧬
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-bold text-sm">{product!.name}</h3>
                      <button
                        onClick={() => removeFromCart(product!.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {product!.volume} • {product!.purity}
                    </p>

                    <div className="flex justify-between items-center">
                      <span className="font-bold text-accent">
                        {formatCurrency(product!.price * qty)}
                      </span>

                      {/* Controls */}
                      <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-2 py-1">
                        <button
                          onClick={() => updateQuantity(product!.id, qty - 1)}
                          className="p-1 hover:text-accent transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-semibold min-w-[1.5rem] text-center">
                          {qty}
                        </span>
                        <button
                          onClick={() => updateQuantity(product!.id, qty + 1)}
                          className="p-1 hover:text-accent transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Footer Drawer */}
        <DrawerFooter className="border-t pt-6 bg-muted/5">
          {cartProducts.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-xl font-bold text-foreground">
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              <Link
                href="/checkout"
                className="w-full"
                onClick={() => setIsCartOpen(false)}
              >
                <Button className="w-full bg-accent hover:bg-accent/90 text-white py-6 rounded-xl text-lg font-bold shadow-lg shadow-accent/20">
                  Proceed to Checkout
                </Button>
              </Link>

              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                Research Use Only • Secure Encryption
              </p>
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
