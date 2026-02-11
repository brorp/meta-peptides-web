"use client";

import { ProductCard } from "@/components/product-card";
import { Card } from "@/components/ui/card";
import { products } from "@/contants/product";
import { Filter, ChevronDown, LayoutGrid, ListFilter } from "lucide-react";

export default function ShopPageComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/20">
      {/* Header Section - Modern Gradient */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-[#0F172A]">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[120px] -mr-40 -mt-40" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent text-[10px] font-black uppercase tracking-[0.2em]">
              Research-Only Compounds
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">
              VIRTUAL <span className="text-accent italic">CATALOG.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl font-medium italic">
              Verified purity ≥99%. Every batch is subject to rigorous HPLC/MS
              testing for laboratory integrity.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar Filter - Re-styled */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="sticky top-28 space-y-4">
              <Card className="border-none bg-muted/30 backdrop-blur-sm p-8 rounded-[2rem] shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-accent" />
                    <h3 className="font-black uppercase tracking-widest text-[11px]">
                      Filters
                    </h3>
                  </div>
                  <button className="text-[10px] font-bold text-muted-foreground hover:text-accent transition-colors underline underline-offset-4">
                    Reset
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Category Select */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">
                      Peptide Category
                    </label>
                    <div className="space-y-2">
                      {["All Research", "Fat Loss", "Healing", "Cognitive"].map(
                        (cat) => (
                          <label
                            key={cat}
                            className="flex items-center gap-3 text-sm font-medium cursor-pointer group"
                          >
                            <input
                              type="radio"
                              name="cat"
                              className="w-4 h-4 border-2 border-muted bg-transparent checked:bg-accent appearance-none rounded-full transition-all cursor-pointer"
                            />
                            <span className="group-hover:text-accent transition-colors">
                              {cat}
                            </span>
                          </label>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">
                      Price Range
                    </label>
                    <div className="relative group">
                      <select className="w-full appearance-none px-4 py-3 bg-white border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-accent outline-none cursor-pointer shadow-sm">
                        <option>All Prices</option>
                        <option>Under $50</option>
                        <option>$50 - $150</option>
                        <option>$150+</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-accent transition-colors" />
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="pt-4 border-t border-border">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-bold italic">
                        In-Stock Only
                      </span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                      </div>
                    </label>
                  </div>
                </div>
              </Card>
            </div>
          </aside>

          {/* Grid Area */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="mb-10 flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-lg">
                  <LayoutGrid className="w-5 h-5 text-accent" />
                </div>
                <p className="text-sm font-black tracking-tight uppercase">
                  Showing{" "}
                  <span className="text-accent underline underline-offset-4">
                    {products.length}
                  </span>{" "}
                  Compounds
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Sort:
                </span>
                <select className="text-sm bg-transparent font-black uppercase tracking-tight outline-none cursor-pointer hover:text-accent transition-colors">
                  <option>Popularity</option>
                  <option>Price: Low-High</option>
                  <option>Purity %</option>
                </select>
              </div>
            </div>

            {/* Product Grid - Enhanced spacing & responsive handling */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 md:gap-8">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="transition-transform duration-500 hover:-translate-y-2"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {/* Pagination / Load More (Optional Placeholder) */}
            <div className="mt-20 flex justify-center">
              <button className="group flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-muted flex items-center justify-center group-hover:border-accent transition-colors">
                  <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:animate-bounce" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                  Load More
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
