"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  PackagePlus,
  Plus,
  Save,
  Trash2,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";
import { useApiQuery } from "@/hooks/api/useApiQuery";

type InventoryProduct = {
  id: string;
  name: string;
  label?: string | null;
  category?: string | null;
  stock: number;
  cost_of_goods: number;
  inventory_type?: "product" | "packaging" | "supply" | null;
  is_active?: boolean | null;
};

type InventoryComponent = {
  id?: string;
  product_id: string;
  component_product_id: string;
  quantity_per_unit: number;
};

type PackagingForm = {
  name: string;
  stock: string;
  cost_of_goods: string;
};

const buildPackagingForm = (): PackagingForm => ({
  name: "",
  stock: "0",
  cost_of_goods: "0",
});

const buildBlankComponent = (productId: string): InventoryComponent => ({
  product_id: productId,
  component_product_id: "",
  quantity_per_unit: 1,
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || error?.error || fallback;

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [components, setComponents] = useState<InventoryComponent[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [componentRows, setComponentRows] = useState<InventoryComponent[]>([]);
  const [packagingForm, setPackagingForm] =
    useState<PackagingForm>(buildPackagingForm);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [savingComponents, setSavingComponents] = useState(false);
  const [creatingPackaging, setCreatingPackaging] = useState(false);
  const {
    data: productsResponse,
    isLoading: loadingProducts,
    refetch: refetchProducts,
  } = useApiQuery<any>(
    ["admin-inventory-products"],
    "/admin/products",
    { params: { page: 1, limit: 1000 } },
    { staleTime: 60 * 1000 },
  );
  const {
    data: componentsResponse,
    isLoading: loadingComponents,
    refetch: refetchComponents,
  } = useApiQuery<any>(
    ["admin-inventory-components"],
    "/admin/inventory/components",
    undefined,
    { staleTime: 60 * 1000 },
  );
  const loading = loadingProducts || loadingComponents;

  useEffect(() => {
    const nextProducts = productsResponse?.data || [];
    setProducts(nextProducts);

    if (!selectedProductId && nextProducts.length) {
      const firstSellable = nextProducts.find(
        (product: InventoryProduct) =>
          (product.inventory_type || "product") === "product",
      );
      setSelectedProductId(firstSellable?.id || nextProducts[0].id);
    }
  }, [productsResponse]);

  useEffect(() => {
    setComponents(componentsResponse?.data || []);
  }, [componentsResponse]);

  const refetchInventory = async () => {
    await Promise.all([refetchProducts(), refetchComponents()]);
  };

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const sellableProducts = products.filter(
    (product) => (product.inventory_type || "product") === "product",
  );

  const componentOptions = products.filter(
    (product) => (product.inventory_type || "product") !== "product",
  );

  useEffect(() => {
    if (!selectedProductId) {
      setComponentRows([]);
      return;
    }

    const rows = components
      .filter((component) => component.product_id === selectedProductId)
      .map((component) => ({ ...component }));

    setComponentRows(rows.length ? rows : [buildBlankComponent(selectedProductId)]);
  }, [components, selectedProductId]);

  const updateProduct = (
    productId: string,
    patch: Partial<Pick<InventoryProduct, "stock" | "cost_of_goods">>,
  ) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, ...patch } : product,
      ),
    );
  };

  const saveProduct = async (product: InventoryProduct) => {
    setSavingProductId(product.id);
    try {
      await axios.put(`/admin/products/${product.id}`, {
        stock: Number(product.stock || 0),
        cost_of_goods: Number(product.cost_of_goods || 0),
        inventory_type: product.inventory_type || "product",
      });
      toast.success("Inventory item updated");
      refetchInventory();
    } catch (error: any) {
      toast.error("Failed to update inventory item", {
        description: getErrorMessage(error, "Please review stock and COGS."),
      });
    } finally {
      setSavingProductId(null);
    }
  };

  const createPackaging = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!packagingForm.name.trim()) {
      toast.error("Packaging name is required");
      return;
    }

    setCreatingPackaging(true);
    try {
      await axios.post("/admin/products", {
        name: packagingForm.name.trim(),
        label: "Packaging",
        price: 0,
        original_price: 0,
        stock: Number(packagingForm.stock || 0),
        cost_of_goods: Number(packagingForm.cost_of_goods || 0),
        category: "Packaging",
        inventory_type: "packaging",
        is_active: false,
      });

      toast.success("Packaging inventory created");
      setPackagingForm(buildPackagingForm());
      refetchInventory();
    } catch (error: any) {
      toast.error("Failed to create packaging item", {
        description: getErrorMessage(error, "Please review the inventory data."),
      });
    } finally {
      setCreatingPackaging(false);
    }
  };

  const updateComponentRow = (
    index: number,
    patch: Partial<InventoryComponent>,
  ) => {
    setComponentRows((prev) =>
      prev.map((component, componentIndex) =>
        componentIndex === index ? { ...component, ...patch } : component,
      ),
    );
  };

  const saveComponents = async () => {
    if (!selectedProductId) return;

    setSavingComponents(true);
    try {
      const validRows = componentRows
        .filter((component) => component.component_product_id)
        .map((component) => ({
          component_product_id: component.component_product_id,
          quantity_per_unit: Number(component.quantity_per_unit || 1),
        }));

      await axios.put("/admin/inventory/components", {
        product_id: selectedProductId,
        components: validRows,
      });

      toast.success("Packaging recipe updated");
      refetchInventory();
    } catch (error: any) {
      toast.error("Failed to update packaging recipe", {
        description: getErrorMessage(error, "Please review the selected items."),
      });
    } finally {
      setSavingComponents(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Manage product stock, COGS, and packaging deductions from one products-backed inventory.
        </p>
      </div>

      <form
        onSubmit={createPackaging}
        className="bg-card border border-border rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <PackagePlus className="h-5 w-5 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">
            Add Packaging Item
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_160px_180px_auto]">
          <input
            value={packagingForm.name}
            onChange={(event) =>
              setPackagingForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Box, vial label, insert card..."
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <input
            type="number"
            min="0"
            value={packagingForm.stock}
            onChange={(event) =>
              setPackagingForm((prev) => ({ ...prev, stock: event.target.value }))
            }
            placeholder="Stock"
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <input
            type="number"
            min="0"
            value={packagingForm.cost_of_goods}
            onChange={(event) =>
              setPackagingForm((prev) => ({
                ...prev,
                cost_of_goods: event.target.value,
              }))
            }
            placeholder="COGS"
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <button
            type="submit"
            disabled={creatingPackaging}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:bg-accent/90 disabled:opacity-60"
          >
            {creatingPackaging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </button>
        </div>
      </form>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <Warehouse className="h-5 w-5 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">
              Stock & COGS
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-5 py-3 text-left font-medium">Item</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-left font-medium">Stock</th>
                  <th className="px-5 py-3 text-left font-medium">COGS</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border/50 hover:bg-muted/30"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.label || product.category || "-"}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-lg border border-border px-2 py-1 text-xs capitalize text-muted-foreground">
                        {product.inventory_type || "product"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        min="0"
                        value={product.stock ?? 0}
                        onChange={(event) =>
                          updateProduct(product.id, {
                            stock: Number(event.target.value || 0),
                          })
                        }
                        className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        min="0"
                        value={product.cost_of_goods ?? 0}
                        onChange={(event) =>
                          updateProduct(product.id, {
                            cost_of_goods: Number(event.target.value || 0),
                          })
                        }
                        className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatCurrency(product.cost_of_goods)}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => saveProduct(product)}
                        disabled={savingProductId === product.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                      >
                        {savingProductId === product.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Packaging Per Product
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              These items are deducted together with the selected product.
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Product
            </span>
            <select
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              {sellableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-3">
            {componentRows.map((component, index) => (
              <div
                key={`${component.component_product_id}-${index}`}
                className="grid gap-3 rounded-xl border border-border bg-background p-3 md:grid-cols-[1fr_120px_40px]"
              >
                <select
                  value={component.component_product_id}
                  onChange={(event) =>
                    updateComponentRow(index, {
                      component_product_id: event.target.value,
                    })
                  }
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  <option value="">Select packaging item</option>
                  {componentOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.stock ?? 0} stock)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={component.quantity_per_unit}
                  onChange={(event) =>
                    updateComponentRow(index, {
                      quantity_per_unit: Number(event.target.value || 1),
                    })
                  }
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="Qty"
                />
                <button
                  type="button"
                  onClick={() =>
                    setComponentRows((prev) =>
                      prev.length > 1
                        ? prev.filter((_, componentIndex) => componentIndex !== index)
                        : [buildBlankComponent(selectedProductId)],
                    )
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setComponentRows((prev) => [
                  ...prev,
                  buildBlankComponent(selectedProductId),
                ])
              }
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Add Component
            </button>
            <button
              type="button"
              onClick={saveComponents}
              disabled={savingComponents || !selectedProductId}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-accent-foreground transition-all hover:bg-accent/90 disabled:opacity-60"
            >
              {savingComponents ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Recipe
            </button>
          </div>

          {selectedProductId && (
            <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
              {componentRows
                .filter((component) => component.component_product_id)
                .map((component) => {
                  const item = productMap.get(component.component_product_id);
                  return `${component.quantity_per_unit} x ${item?.name || "item"}`;
                })
                .join(", ") || "No packaging will be deducted for this product yet."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
