import { SlidersHorizontal, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface FilterSidebarProps {
  categories: string[];
  sortOptions: { label: string; value: string }[];
  selectedCategory: string;
  sortBy: string;
  isCatOpen: boolean;
  isSortOpen: boolean;
  isFiltering: boolean;
  onSelectCategory: (cat: string) => void;
  onSelectSort: (val: string) => void;
  onOpenCatChange: (open: boolean) => void;
  onOpenSortChange: (open: boolean) => void;
  onReset: () => void;
  hideHeader?: boolean;
}

export function FilterSidebar({
  categories,
  sortOptions,
  selectedCategory,
  sortBy,
  isCatOpen,
  isSortOpen,
  isFiltering,
  onSelectCategory,
  onSelectSort,
  onOpenCatChange,
  onOpenSortChange,
  onReset,
  hideHeader = false,
}: FilterSidebarProps) {
  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">
              Filters
            </h2>
          </div>
          {isFiltering && (
            <button
              onClick={onReset}
              className="text-[10px] font-bold text-accent uppercase tracking-tighter hover:underline animate-in fade-in zoom-in"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Category Collapsible */}
      <Collapsible
        open={isCatOpen}
        onOpenChange={onOpenCatChange}
        className="border-b border-slate-100 pb-2"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full group py-3">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-900 transition-colors">
            Categories
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-slate-300 transition-transform duration-300",
              isCatOpen && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={cn(
                "text-left px-4 py-3 rounded-xl text-xs font-semibold w-full transition-all flex items-center justify-between group",
                selectedCategory === cat
                  ? "bg-[#414042] text-white shadow-md shadow-slate-200"
                  : "text-primary hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              {cat}
              {selectedCategory === cat && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              )}
            </button>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Sort Collapsible */}
      <Collapsible
        open={isSortOpen}
        onOpenChange={onOpenSortChange}
        className="border-b border-slate-100 pb-2"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full group py-3">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-900 transition-colors">
            Sort By
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-slate-300 transition-transform duration-300",
              isSortOpen && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSelectSort(opt.value)}
              className={cn(
                "text-left px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tight w-full transition-all",
                sortBy === opt.value
                  ? "bg-accent/5 text-accent border border-accent/20"
                  : "text-primary border border-transparent hover:bg-slate-50",
              )}
            >
              {opt.label}
            </button>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
