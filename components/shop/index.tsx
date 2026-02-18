"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { Search, Loader2, Filter } from "lucide-react";
import { useGetProducts } from "@/hooks/api/useGetProducts";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductCardSkeleton } from "@/components/skeleton/product-card-skeleton";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "../pagination";
import { FilterSidebar } from "./filter-sidebar";
import { MobileFilterDrawer } from "./mobile-filter-drawer";

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
  const [isCatOpen, setIsCatOpen] = useState(true);
  const [isSortOpen, setIsSortOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);
  const isFiltering =
    searchQuery !== "" || selectedCategory !== "All" || sortBy !== "latest";

  const { data, isPending: isLoading } = useGetProducts({
    page: currentPage,
    keyword: debouncedSearch,
    category: selectedCategory === "All" ? "" : selectedCategory,
    sort: sortBy,
  });

  const filterProps = {
    categories: CATEGORIES,
    sortOptions: SORT_OPTIONS,
    selectedCategory,
    sortBy,
    isCatOpen,
    isSortOpen,
    isFiltering,
    onSelectCategory: setSelectedCategory,
    onSelectSort: setSortBy,
    onOpenCatChange: setIsCatOpen,
    onOpenSortChange: setIsSortOpen,
    onReset: () => {
      setSelectedCategory("All");
      setSortBy("latest");
      setSearchQuery("");
    },
  };

  useEffect(
    () => setCurrentPage(1),
    [debouncedSearch, selectedCategory, sortBy],
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-foreground">
      {/* Header Section */}
      <section className="pt-24 pb-12 bg-[#0F172A] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-accent/10 blur-[120px] -mr-40 -mt-40" />
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-32 h-fit">
            <FilterSidebar {...filterProps} />
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9 space-y-8">
            <div className="grid grid-cols-12 gap-3 items-stretch">
              <div className="relative group col-span-9 lg:col-span-12">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-accent transition-colors" />
                <input
                  type="text"
                  placeholder="Search for sequences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all placeholder:text-slate-300"
                />
                {isLoading && (
                  <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-accent" />
                )}
              </div>

              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden col-span-3 flex flex-col items-center justify-center gap-1 rounded-2xl border bg-accent/5 border-accent/20 text-accent active:scale-95"
              >
                <Filter className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-tighter">
                  Filter
                </span>
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : data?.data?.length ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-x-6 md:gap-y-10">
                  {data.data.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => router.push(`/shop/${product.slug}`)}
                    />
                  ))}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={data.pagination.total_pages}
                  onPageChange={(p) => {
                    setCurrentPage(p);
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

      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        sidebarProps={filterProps}
      />
    </div>
  );
}
