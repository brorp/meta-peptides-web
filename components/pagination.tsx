"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  // Fungsi untuk menentukan nomor halaman mana saja yang muncul
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const delta = 1; // Jumlah halaman di kiri & kanan halaman aktif

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // Selalu tampilkan halaman pertama
        i === totalPages || // Selalu tampilkan halaman terakhir
        (i >= currentPage - delta && i <= currentPage + delta) // Halaman di sekitar aktif
      ) {
        pages.push(i);
      } else if (
        i === currentPage - delta - 1 ||
        i === currentPage + delta + 1
      ) {
        pages.push("..."); // Tambahkan titik-titik
      }
    }
    // Hapus duplikasi titik-titik yang berdekatan
    return pages.filter((page, index) => pages.indexOf(page) === index);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-6 mt-16 mb-10">
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-slate-100">
        {/* Tombol Previous */}
        <Button
          variant="ghost"
          size="icon"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="w-9 h-9 rounded-xl hover:bg-slate-50 disabled:opacity-20 transition-all"
        >
          <ChevronLeft size={18} className="text-slate-600" />
        </Button>

        {/* Render Halaman */}
        <div className="flex items-center gap-1 px-1">
          {getVisiblePages().map((page, index) => {
            if (page === "...") {
              return (
                <div
                  key={`ellipsis-${index}`}
                  className="w-9 h-9 flex items-center justify-center"
                >
                  <MoreHorizontal size={14} className="text-slate-300" />
                </div>
              );
            }

            const pageNum = page as number;
            const isActive = currentPage === pageNum;

            return (
              <button
                key={`page-${pageNum}`}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "relative w-9 h-9 rounded-xl text-[11px] font-bold transition-all duration-300 border flex items-center justify-center",
                  isActive
                    ? "bg-white border-accent text-accent shadow-sm shadow-accent/20 scale-110 z-10"
                    : "bg-transparent border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-white",
                )}
              >
                <span className="relative">{String(pageNum)}</span>
              </button>
            );
          })}
        </div>

        {/* Tombol Next */}
        <Button
          variant="ghost"
          size="icon"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="w-9 h-9 rounded-xl hover:bg-slate-50 disabled:opacity-20 transition-all"
        >
          <ChevronRight size={18} className="text-slate-600" />
        </Button>
      </div>

      {/* Label Info */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-slate-100" />
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 italic font-mono">
            Lab Page {currentPage} of {totalPages}
          </p>
          <div className="h-px w-8 bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
