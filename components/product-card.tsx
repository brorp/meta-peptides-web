"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { ProductInterface } from "@/interface/products";
import { toast } from "sonner";

export function ProductCard({
  product,
  onClick,
}: {
  product: ProductInterface;
  onClick?: () => void;
}) {
  const addToCart = useCartStore((state) => state.addToCart);

  return (
    <Card
      onClick={onClick}
      className="group relative border border-border/50 bg-card hover:border-accent/40 transition-all duration-500 rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-2xl hover:shadow-accent/5 hover:-translate-y-1 cursor-pointer"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted/50 to-accent/5">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            priority={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <div className="relative z-10 text-6xl transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ease-out">
              🧬
            </div>
          </div>
        )}

        {/* Overlay for hover effect */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
          {/* Tambahan: Nama Label (Kimia) */}
          <p className="text-xs text-muted-foreground italic line-clamp-1">
            {product.label}
          </p>
        </div>

        {/* Pricing Area */}
        <div className="flex flex-col items-start gap-0.5 mb-4">
          <span className="text-sm text-muted-foreground line-through decoration-red-500/30">
            {formatCurrency(product.original_price)}
          </span>
          <span className="text-2xl font-black text-foreground tracking-tighter">
            {formatCurrency(product.price)}
          </span>
        </div>

        {/* Stock Bar Indicator */}
        <div className="mt-auto">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
              Available
            </span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden mb-5">
            <div
              className="h-full transition-all duration-1000 bg-emerald-500"
              style={{ width: "100%" }}
            />
          </div>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
              toast.success("Added to Cart", {
                description: `${product.name} is now in your shopping bag.`,
              });
            }}
            className={cn(
              "w-full rounded-2xl py-4 h-auto font-bold transition-all duration-300",
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
