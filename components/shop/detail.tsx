"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductInterface } from "@/interface/products";
import { formatCurrency } from "@/lib/format";
import { useCartStore } from "@/store/useCartStore";
import {
  Beaker,
  ClipboardCheck,
  ThermometerSnowflake,
  ChevronRight,
  ShieldCheck,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ProductDetailComponent({
  product,
}: {
  product: ProductInterface;
}) {
  const addToCart = useCartStore((state) => state.addToCart);

  return (
    <div className="min-h-screen bg-background pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* --- TOP SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
          <div className="relative group">
            <div className="absolute -inset-4 bg-accent/5 rounded-[3rem] blur-2xl group-hover:bg-accent/10 transition-colors" />
            <div className="relative aspect-square rounded-[2.5rem] border border-border bg-muted/30 overflow-hidden flex items-center justify-center p-12">
              <img
                src={product?.image_url || "/product/product1.png"}
                alt={product?.name}
                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
              />
              <Badge className="absolute top-8 left-8 bg-black text-white border-none px-4 py-1 uppercase tracking-widest text-[10px]">
                Purity {product?.purity || "≥99%"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-xl lg:text-3xl font-black tracking-tighter uppercase leading-none">
                {product?.name} <br />
              </h1>
              <span className="text-xs lg:text-base font-semibold italic">
                Category : {product?.category}.
              </span>
              <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-2xl border-l-4 border-accent">
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  {product?.short_desc}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-border bg-white shadow-sm">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  CAS Number
                </p>
                <p className="text-sm font-bold tracking-tight">
                  {product?.cas || "N/A"}
                </p>
              </div>
            </div>

            <div className="pt-6 space-y-6">
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black tracking-tighter">
                  {formatCurrency(product?.price || 0)}
                </span>
                <span className="text-muted-foreground font-bold mb-1 uppercase text-xs tracking-widest">
                  / {product?.volume} Unit
                </span>
              </div>
              <Button
                onClick={() => {
                  addToCart(product);
                  toast.success("Added to Cart", {
                    description: `${product.name} is now in your shopping bag.`,
                  });
                }}
                className="w-full h-16 rounded-2xl bg-black hover:bg-accent text-white font-black uppercase tracking-widest transition-all group"
              >
                Add to cart
                <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>

        {/* --- BOTTOM SECTION: TECHNICAL DOCUMENTATION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* --- IMPLEMENTASI TABS --- */}
            <Tabs defaultValue="storage" className="w-full">
              <TabsList className="flex w-full bg-slate-100 h-12 p-1 rounded-xl border border-slate-200">
                <TabsTrigger
                  value="storage"
                  className="flex-1 rounded-lg h-full font-black uppercase tracking-widest text-[9px] data-[state=active]:bg-black data-[state=active]:text-white transition-all"
                >
                  <ThermometerSnowflake className="w-3 h-3 mr-2" />
                  Storage
                </TabsTrigger>
                <TabsTrigger
                  value="usage"
                  className="flex-1 rounded-lg h-full font-black uppercase tracking-widest text-[9px] data-[state=active]:bg-accent data-[state=active]:text-white transition-all"
                >
                  <Beaker className="w-3 h-3 mr-2" />
                  Guidelines
                </TabsTrigger>
                <TabsTrigger
                  value="dosing"
                  className="flex-1 rounded-lg h-full font-black uppercase tracking-widest text-[9px] data-[state=active]:bg-black data-[state=active]:text-white transition-all"
                >
                  <Activity className="w-3 h-3 mr-2" />
                  Dosing
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="storage"
                className="mt-6 focus-visible:outline-none"
              >
                <Card className="p-8 border-none bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <Badge
                      variant="outline"
                      className="text-accent border-accent/30 text-[9px] font-black"
                    >
                      STABILITY PROTOCOL
                    </Badge>
                    <p className="text-[13px] leading-relaxed text-slate-300 font-bold uppercase tracking-wide whitespace-pre-line">
                      {product?.storage_instruction}
                    </p>
                  </div>
                  <ThermometerSnowflake className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12" />
                </Card>
              </TabsContent>

              <TabsContent
                value="usage"
                className="mt-6 focus-visible:outline-none"
              >
                <Card className="p-8 border-none bg-accent text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <Badge
                      variant="outline"
                      className="text-white border-white/30 text-[9px] font-black italic"
                    >
                      RECONSTITUTION GUIDE
                    </Badge>
                    <p className="text-[13px] leading-relaxed font-black uppercase tracking-tight italic">
                      {product?.usage_instruction}
                    </p>
                  </div>
                  <Beaker className="absolute -bottom-6 -right-6 w-32 h-32 text-black/10 -rotate-12" />
                </Card>
              </TabsContent>

              <TabsContent
                value="dosing"
                className="mt-6 focus-visible:outline-none"
              >
                <Card className="p-8 border-none bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <Badge
                      variant="outline"
                      className="text-accent border-accent/30 text-[9px] font-black"
                    >
                      RESEARCH DOSING
                    </Badge>
                    <p className="text-[13px] leading-relaxed text-slate-300 font-bold uppercase tracking-wide whitespace-pre-line">
                      {product?.dosing ||
                        "No specific dosing protocol defined for this sequence."}
                    </p>
                  </div>
                  <ThermometerSnowflake className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12" />
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Column 2: COA & Verification */}
          <div className="space-y-6">
            <div className="p-8 rounded-[2.5rem] border border-border bg-muted/20 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="flex items-center gap-3">
                <ClipboardCheck className="text-accent w-6 h-6" />
                <h4 className="font-black uppercase tracking-widest text-xs">
                  Quality Assurance (COA)
                </h4>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase border-b border-border pb-2">
                  <span className="text-muted-foreground">Purity Level</span>
                  <span className="text-green-600 font-black">
                    {product?.purity}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase border-b border-border pb-2">
                  <span className="text-muted-foreground">Appearance</span>
                  <span className="text-foreground">Lyophilized Powder</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase border-b border-border pb-2">
                  <span className="text-muted-foreground">Identity (MS)</span>
                  <span className="text-foreground">Confirmed</span>
                </div>
              </div>

              <Link href="/peptide-labtest" className="block w-full">
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-border hover:bg-black hover:text-white text-[10px] font-black uppercase tracking-[0.2em] py-6 shadow-sm transition-all"
                >
                  View Lab Test Reports
                </Button>
              </Link>

              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">
                  Verified by MetaPeptides Indonesia Lab
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
