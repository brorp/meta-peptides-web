"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Beaker, ShieldCheck, Zap } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  price: number;
  original: number;
  purity: string;
  volume: string;
  stock: number;
}

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useCartStore((state) => state.addToCart);

  return (
    <Card className="group relative border border-border/50 bg-card hover:border-accent/40 transition-all duration-500 rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-2xl hover:shadow-accent/5 hover:-translate-y-1">
      {/* Visual Top Section */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted/50 to-accent/5 flex items-center justify-center">
        {/* Animated DNA/Icon background */}
        <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500">
          <Beaker className="w-full h-full scale-150 rotate-12" />
        </div>

        <div className="relative z-10 text-6xl transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ease-out">
          🧬
        </div>

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.purity && (
            <div className="backdrop-blur-md bg-white/70 border border-white/20 text-accent text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {product.purity} PURITY
            </div>
          )}
        </div>

        {product.stock <= 5 && product.stock > 0 && (
          <div className="absolute top-3 right-3 bg-orange-500/90 backdrop-blur-sm text-white text-[9px] font-black px-2 py-1 rounded-md shadow-lg animate-pulse">
            CRITICAL STOCK
          </div>
        )}

        {product.stock === 0 && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="border-2 border-foreground/10 px-4 py-2 rounded-xl rotate-[-10deg] font-black text-foreground/40 text-xl uppercase tracking-tighter">
              Out of Order
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="mb-3">
          <div className="flex justify-between items-start gap-2 mb-1">
            <h3 className="font-black text-base md:text-lg tracking-tight leading-tight group-hover:text-accent transition-colors">
              {product.name}
            </h3>
            <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground whitespace-nowrap">
              {product.volume}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="w-3 h-3 text-orange-400 fill-orange-400" />
            <span className="text-[11px] font-medium">Verified Compound</span>
          </div>
        </div>

        {/* Pricing Area */}
        <div className="flex items-end gap-2 mb-4">
          <span className="text-2xl font-black text-foreground tracking-tighter">
            ${product.price.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground line-through mb-1 decoration-red-500/30">
            ${product.original.toFixed(2)}
          </span>
        </div>

        {/* Stock Bar Indicator */}
        <div className="mt-auto">
          <div className="flex justify-between items-center mb-1.5">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                product.stock > 5
                  ? "text-emerald-500"
                  : product.stock > 0
                    ? "text-orange-500"
                    : "text-red-500",
              )}
            >
              {product.stock > 0
                ? `Availability: ${product.stock} Units`
                : "Discontinued"}
            </span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden mb-5">
            <div
              className={cn(
                "h-full transition-all duration-1000",
                product.stock > 5 ? "bg-emerald-500" : "bg-orange-500",
              )}
              style={{ width: `${Math.min((product.stock / 20) * 100, 100)}%` }}
            />
          </div>

          {/* Action Button */}
          <Button
            onClick={() => addToCart(product.id)}
            disabled={product.stock === 0}
            className={cn(
              "w-full rounded-2xl py-6 h-auto font-bold transition-all duration-300",
              "bg-foreground text-background hover:bg-accent hover:text-white hover:scale-[1.02] active:scale-95",
              "shadow-xl shadow-foreground/5 hover:shadow-accent/20 disabled:opacity-30 disabled:grayscale",
            )}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
}
