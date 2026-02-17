"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Filter,
} from "lucide-react";
import { useGetProducts } from "@/hooks/api/useGetProducts";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductCardSkeleton } from "@/components/skeleton/product-card-skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Pagination } from "../pagination";

const CATEGORIES = [
  "All",
  "Weight Loss",
  "Growth Hormone",
  "Recovery",
  "Longevity",
  "Sleep Management",
  "Cognitive & Neurological",
  "Skin Benefits",
  "Other Categories",
];

const SORT_OPTIONS = [
  { label: "Popularity", value: "popularity" },
  { label: "Latest", value: "latest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

export default function ShopPageComponent() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("latest");

  // State untuk Collapse
  const [isCatOpen, setIsCatOpen] = useState(true);
  const [isSortOpen, setIsSortOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCategory, sortBy]);

  const { data, isPending: isLoading } = useGetProducts({
    page: currentPage,
    keyword: debouncedSearch,
    category: selectedCategory === "All" ? "" : selectedCategory,
    sort: sortBy,
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-foreground">
      {/* Header Section */}
      <section className="pt-32 pb-12 bg-[#0F172A] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 blur-[120px] -mr-40 -mt-40" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center lg:text-left">
          <Badge className="bg-accent/20 text-accent border-accent/30 mb-4 uppercase tracking-[0.2em]">
            Precision Research
          </Badge>
          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter italic">
            CATALOG<span className="text-accent text-6xl">.</span>
          </h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* --- LEFT COLUMN: COLLAPSIBLE FILTERS --- */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-32 h-fit">
            <div className="flex items-center gap-2 mb-6">
              <SlidersHorizontal className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-black uppercase tracking-widest">
                Filters
              </h2>
            </div>

            {/* Category Collapsible */}
            <Collapsible
              open={isCatOpen}
              onOpenChange={setIsCatOpen}
              className="border-b border-slate-100 pb-4"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full group py-2">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-900 transition-colors">
                  Categories
                </span>
                {isCatOpen ? (
                  <ChevronUp className="w-3 h-3 text-slate-300" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-300" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-2 animate-in fade-in slide-in-from-top-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "text-left px-4 py-2.5 rounded-xl text-xs font-semibold w-full transition-all",
                      selectedCategory === cat
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 hover:bg-white hover:text-slate-900",
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Sort Collapsible */}
            <Collapsible
              open={isSortOpen}
              onOpenChange={setIsSortOpen}
              className="border-b border-slate-100 pb-4"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full group py-2">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-900 transition-colors">
                  Sort By
                </span>
                {isSortOpen ? (
                  <ChevronUp className="w-3 h-3 text-slate-300" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-300" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-2 animate-in fade-in slide-in-from-top-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={cn(
                      "text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tight w-full transition-all",
                      sortBy === opt.value
                        ? "text-accent bg-accent/5"
                        : "text-slate-500 hover:bg-white",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </aside>

          {/* --- RIGHT COLUMN: SEARCH & GRID --- */}
          <main className="lg:col-span-9 space-y-8">
            {/* Search Bar at Right Top */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center justify-center gap-2 w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm font-bold text-xs uppercase tracking-widest text-slate-600"
              >
                <Filter className="w-4 h-4 text-accent" /> Filters
              </button>

              <div className="relative group flex-1 w-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-accent transition-colors" />
                <input
                  type="text"
                  placeholder="Search for sequences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-14 pr-12 text-sm font-bold shadow-sm focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all"
                />
                {isLoading && (
                  <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-accent" />
                )}
              </div>
            </div>

            {/* Grid Area */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : data?.data && data.data.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10">
                  {data.data.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => router.push(`/shop/${product.slug}`)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={data.pagination.total_pages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                />
              </>
            ) : (
              <div className="py-32 text-center bg-white rounded-[3rem] border border-slate-100 border-dashed italic text-slate-400">
                No matching research sequences found.
              </div>
            )}
          </main>
        </div>
      </div>

      {/* --- MOBILE OVERLAY --- */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm lg:hidden flex justify-end">
          <div className="w-[85%] max-w-sm bg-white h-full p-8 space-y-8 animate-in slide-in-from-right overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-black italic uppercase tracking-tight">
                Filters
              </h2>
              <button onClick={() => setIsMobileFilterOpen(false)}>
                <X />
              </button>
            </div>
            {/* Same logic but simplified for mobile */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Categories
                </p>
                <div className="flex flex-col gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIsMobileFilterOpen(false);
                      }}
                      className={cn(
                        "text-left p-3 rounded-xl text-xs font-bold",
                        selectedCategory === cat
                          ? "bg-slate-900 text-white"
                          : "bg-slate-50",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
