"use client";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { faqCategories } from "@/contants/faq";

export default function FAQPageComponent() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(
    faqCategories[0].category,
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section - Cleaner without Search */}
      <section className="relative bg-[#414042] pb-16 pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 md:w-96 md:h-96 bg-accent rounded-full blur-[80px] md:blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <span className="inline-block px-4 py-1.5 mb-4 md:mb-6 text-[10px] md:text-xs font-bold tracking-[0.2em] text-accent uppercase bg-accent/10 rounded-full border border-accent/20">
            Support Center
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
            Frequently Asked <span className="text-accent">Questions</span>
          </h1>
          <p className="text-white/60 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Select a category to find answers regarding our research compounds,
            shipping, and lab protocols.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Sidebar Navigation - Horizontal Scroll on Mobile */}
          <aside className="lg:w-64 flex-shrink-0 lg:sticky lg:top-28 h-fit z-30">
            <p className="hidden lg:block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 px-4">
              Categories
            </p>
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-2 no-scrollbar scroll-smooth">
              {faqCategories.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => {
                    setActiveCategory(cat.category);
                    const el = document.getElementById(cat.category);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "whitespace-nowrap px-5 py-2.5 lg:py-3 rounded-full lg:rounded-xl text-xs md:text-sm font-bold transition-all border lg:border-none",
                    activeCategory === cat.category
                      ? "bg-accent text-white shadow-lg shadow-accent/20 border-accent scale-105 lg:scale-100"
                      : "bg-white lg:bg-transparent text-muted-foreground border-border hover:border-accent/50",
                  )}
                >
                  {cat.category}
                </button>
              ))}
            </div>
          </aside>

          {/* FAQ Content */}
          <div className="flex-1 space-y-12 md:space-y-20">
            {faqCategories.map((category) => (
              <div
                key={category.category}
                id={category.category}
                className="scroll-mt-24 md:scroll-mt-32"
              >
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                  <div className="h-6 md:h-8 w-1.5 bg-accent rounded-full" />
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-[#414042]">
                    {category.category}
                  </h2>
                </div>

                <div className="grid gap-3 md:gap-4">
                  {category.questions.map((item, i) => {
                    const id = `${category.category}-${i}`;
                    const isExpanded = expandedId === id;

                    return (
                      <div
                        key={id}
                        className={cn(
                          "group border border-border/50 bg-white rounded-xl md:rounded-2xl transition-all duration-300",
                          isExpanded
                            ? "shadow-md ring-1 ring-accent/5"
                            : "hover:border-accent/30 shadow-sm",
                        )}
                      >
                        <button
                          onClick={() => toggleExpand(id)}
                          className="w-full px-5 py-4 md:px-6 md:py-5 text-left flex justify-between items-center gap-4"
                        >
                          <span
                            className={cn(
                              "font-bold text-sm md:text-lg transition-colors leading-tight",
                              isExpanded ? "text-accent" : "text-[#1E293B]",
                            )}
                          >
                            {item.q}
                          </span>
                          <div
                            className={cn(
                              "p-1 rounded-full shrink-0 transition-all",
                              isExpanded
                                ? "bg-accent text-white rotate-180"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />
                          </div>
                        </button>

                        <div
                          className={cn(
                            "grid transition-all duration-300 ease-in-out",
                            isExpanded
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0",
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="px-5 pb-5 pt-1 md:px-6 md:pb-6 md:pt-2 text-xs md:text-sm text-primary leading-relaxed border-t border-slate-100 mt-2">
                              {item.a}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
