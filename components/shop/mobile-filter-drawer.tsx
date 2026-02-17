import { X, SlidersHorizontal } from "lucide-react";
import { FilterSidebar } from "./filter-sidebar";

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarProps: any;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  sidebarProps,
}: MobileFilterDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm lg:hidden flex justify-end"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[85%] max-w-sm bg-white h-full p-8 animate-in slide-in-from-right overflow-y-auto shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">
              Filters
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {sidebarProps.isFiltering && (
              <button
                onClick={sidebarProps.onReset}
                className="text-[10px] font-bold text-accent uppercase tracking-tighter hover:underline"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X width={20} className="text-slate-400" />
            </button>
          </div>
        </div>
        <FilterSidebar {...sidebarProps} hideHeader />
      </div>
    </div>
  );
}
