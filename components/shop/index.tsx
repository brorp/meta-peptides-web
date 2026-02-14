"use client";

import { ProductCard } from "@/components/product-card";
import { products as localProducts } from "@/contants/product"; // Alias sementara
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ShopPageComponent() {
  const router = useRouter();
  // State untuk API integration
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 8;

  // Mock total pages (Nanti ambil dari API meta data)
  const totalPages = Math.ceil(localProducts.length / itemsPerPage);

  // --- API SIMULATION / PREPARATION ---
  // Gunakan useEffect ini untuk nembak ke API nanti
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      // Nanti ganti dengan fetch(`/api/products?page=${currentPage}&search=${searchQuery}`)
      // console.log("Fetching data for page:", currentPage, "search:", searchQuery);

      // Simulasi loading 500ms
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsLoading(false);
    };

    fetchProducts();
  }, [currentPage, searchQuery]);

  // Handle Search: Reset page ke 1 saat cari baru
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Logic filter lokal (Sambil nunggu API ready)
  const filteredProducts = localProducts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/20">
      {/* Header Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-[#0F172A]">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[120px] -mr-40 -mt-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="space-y-4">
              <Badge className="bg-accent/20 text-accent border-accent/30 uppercase tracking-[0.2em] px-4 py-1">
                Research-Only Compounds
              </Badge>
              <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">
                VIRTUAL <span className="text-accent italic">CATALOG.</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-xl font-medium italic">
                Verified purity ≥99%. Every batch is subject to rigorous HPLC/MS
                testing for laboratory integrity.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col gap-10">
          {/* Toolbar & Search */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6 bg-muted/30 p-4 md:p-6 rounded-[2.5rem] border border-border">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-accent" />
              <input
                type="text"
                placeholder="Search metapeptides..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full bg-white border border-border rounded-2xl py-4 pl-14 pr-12 text-sm font-bold focus:ring-2 focus:ring-accent outline-none"
              />
              {isLoading && (
                <Loader2 className="absolute right-14 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-accent" />
              )}
            </div>

            <div className="flex items-center gap-8 px-4">
              <div className="flex flex-col">
                <p className="text-sm font-black uppercase tracking-tight">
                  <span className="text-accent">{filteredProducts.length}</span>{" "}
                  Entries
                </p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Page
                </span>
                <p className="text-sm font-black uppercase tracking-tight italic">
                  {currentPage}{" "}
                  <span className="text-muted-foreground/30 text-xs">
                    / {totalPages}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Grid Area */}
          <div
            className={`transition-opacity duration-300 ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
          >
            {filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-10">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="transition-all duration-500 hover:-translate-y-3"
                    >
                      <ProductCard
                        product={product}
                        onClick={() => router.push(`/shop/${product.slug}`)}
                      />
                    </div>
                  ))}
                </div>

                {/* --- PAGINATION CONTROLS --- */}
                <div className="mt-20 flex flex-col items-center gap-6">
                  <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-2xl border border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="rounded-xl hover:bg-accent hover:text-white disabled:opacity-30"
                    >
                      <ChevronLeft size={20} />
                    </Button>

                    <div className="flex items-center gap-1 px-4">
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${
                            currentPage === i + 1
                              ? "bg-accent text-white shadow-lg shadow-accent/20 scale-110"
                              : "hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {(i + 1).toString().padStart(2, "0")}
                        </button>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="rounded-xl hover:bg-accent hover:text-white disabled:opacity-30"
                    >
                      <ChevronRight size={20} />
                    </Button>
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">
                    Page {currentPage} of {totalPages}
                  </p>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="py-40 text-center border-2 border-dashed border-muted rounded-[4rem]">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                  No Results.
                </h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
