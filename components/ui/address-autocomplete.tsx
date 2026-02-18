"use client";

import React, { useState, useEffect, useRef } from "react";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import { MapPin, Loader2, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

const provider = new OpenStreetMapProvider({
  params: {
    countrycodes: "id",
    "accept-language": "id",
  },
});

interface AddressAutocompleteProps {
  onSelect: (data: { label: string; postcode: string }) => void;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
}

export function AddressAutocomplete({
  onSelect,
  defaultValue = "",
  placeholder = "Cari Kota atau Kecamatan...",
  error,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAddress = async () => {
      if (debouncedQuery.length < 3) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await provider.search({ query: debouncedQuery });
        const formattedResults = searchResults.map((res) => ({
          ...res,
          label: res.label.replace(", Indonesia", ""),
        }));
        setResults(formattedResults);
      } catch (err) {
        console.error("OSM Search Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddress();
  }, [debouncedQuery]);

  const extractPostcode = (label: string): string => {
    const postcodeMatch = label.match(/\b\d{5}\b/);
    return postcodeMatch ? postcodeMatch[0] : "";
  };

  const cleanLabelFromPostcode = (label: string): string => {
    return label
      .replace(/\b\d{5}\b/g, "")
      .replace(/,\s*,/g, ",")
      .replace(/,\s*$/, "")
      .trim();
  };

  const inputStyles = cn(
    "w-full px-4 py-3 pl-11 rounded-xl border border-slate-200 bg-white text-sm transition-all duration-200",
    "placeholder:text-slate-300 text-slate-700",
    "hover:border-slate-300",
    "focus:border-accent focus:ring-[3px] focus:ring-accent/10 focus:outline-none",
    error && "border-red-500 focus:ring-red-500/10",
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 transition-colors" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            onSelect({ label: e.target.value, postcode: "" });
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={inputStyles}
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-[60] w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
            {results.map((res, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  const originalLabel = res.label;
                  const postCode =
                    res.raw?.address?.postcode ||
                    extractPostcode(originalLabel);

                  const cleanedLabel = cleanLabelFromPostcode(originalLabel);
                  setQuery(cleanedLabel);

                  onSelect({
                    label: cleanedLabel,
                    postcode: postCode,
                  });

                  setIsOpen(false);
                }}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none"
              >
                <MapPin className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700 leading-tight">
                    {res.label.split(",")[0]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {res.label.split(",").slice(1).join(",")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
