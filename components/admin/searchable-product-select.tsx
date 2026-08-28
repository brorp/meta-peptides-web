"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, PackageSearch } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableProductOption = {
  id: string;
  name: string;
  label?: string | null;
  price: number;
  stock?: number | null;
};

type SearchableProductSelectProps = {
  products: SearchableProductOption[];
  value: string;
  onValueChange: (productId: string) => void;
  disabled?: boolean;
  loading?: boolean;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export function SearchableProductSelect({
  products,
  value,
  onValueChange,
  disabled = false,
  loading = false,
}: SearchableProductSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedProduct = products.find((product) => product.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Select product"
          disabled={disabled || loading}
          className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-accent/20 focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            className={cn(
              "min-w-0 truncate",
              !selectedProduct && "text-muted-foreground",
            )}
          >
            {loading
              ? "Loading products..."
              : selectedProduct
                ? `${selectedProduct.name}${selectedProduct.label ? ` (${selectedProduct.label})` : ""}`
                : "Search or select product"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[calc(100vw-2rem)] p-0"
      >
        <Command>
          <CommandInput
            placeholder="Search product name or label..."
            autoFocus
          />
          <CommandList className="max-h-80">
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-2 text-muted-foreground">
                <PackageSearch className="h-5 w-5" />
                <span>No products found.</span>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.label || ""}`}
                  onSelect={() => {
                    onValueChange(product.id);
                    setOpen(false);
                  }}
                  className="items-start py-2.5"
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      value === product.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                      {product.label && <span>{product.label}</span>}
                      <span>{formatCurrency(Number(product.price || 0))}</span>
                      {product.stock !== undefined && product.stock !== null && (
                        <span
                          className={cn(
                            Number(product.stock) <= 0 && "text-destructive",
                          )}
                        >
                          Stock: {product.stock}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
