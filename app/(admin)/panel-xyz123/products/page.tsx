"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    Plus,
    Loader2,
    Edit,
    Trash2,
    PackageX,
    Eye,
    EyeOff,
    Save,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";
import { useApiQuery } from "@/hooks/api/useApiQuery";

type QuickEditField = "price" | "stock";
type QuickEditValues = {
    price: string;
    stock: string;
};
type EditingCells = Record<string, Partial<Record<QuickEditField, boolean>>>;

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value);
}

function formatCurrencyPreview(value: string) {
    const numericValue = Number(value || 0);
    return Number.isFinite(numericValue)
        ? formatCurrency(numericValue)
        : "Invalid price";
}

function makeQuickEditValues(product: any): QuickEditValues {
    return {
        price: String(Number(product.price || 0)),
        stock: String(Number(product.stock || 0)),
    };
}

function getStockTone(value: number | string) {
    const stock = Number(value || 0);

    if (stock <= 0) return "text-destructive";
    if (stock <= 5) return "text-yellow-500";

    return "text-green-500";
}

export default function AdminProductsPage() {
    const router = useRouter();
    const [quickEdits, setQuickEdits] = useState<Record<string, QuickEditValues>>({});
    const [editingCells, setEditingCells] = useState<EditingCells>({});
    const [savingQuickEditKey, setSavingQuickEditKey] = useState<string | null>(null);
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const {
        data: productsResponse,
        isLoading: loading,
        refetch: refetchProducts,
    } = useApiQuery<any>(
        ["admin-products", page, keyword],
        "/admin/products",
        { params: { page, limit: 20, keyword } },
    );
    const products: any[] = productsResponse?.data || [];
    const totalPages = productsResponse?.pagination?.total_pages || 1;

    useEffect(() => {
        setQuickEdits(
            Object.fromEntries(
                products.map((product: any) => [
                    product.id,
                    makeQuickEditValues(product),
                ]),
            ),
        );
    }, [productsResponse]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            await axios.delete(`/admin/products/${id}`);
            toast.success("Product deleted");
            refetchProducts();
        } catch {
            toast.error("Failed to delete product");
        }
    };

    const toggleActive = async (id: string, current: boolean) => {
        try {
            await axios.put(`/admin/products/${id}`, {
                is_active: !current,
            });
            toast.success(current ? "Product hidden" : "Product visible");
            refetchProducts();
        } catch {
            toast.error("Failed to update product");
        }
    };

    const getQuickEditValues = (product: any) =>
        quickEdits[product.id] || makeQuickEditValues(product);

    const getQuickEditKey = (product: any, field: QuickEditField) =>
        `${product.id}:${field}`;

    const isEditingField = (product: any, field: QuickEditField) =>
        editingCells[product.id]?.[field] === true;

    const updateQuickEdit = (
        product: any,
        field: QuickEditField,
        value: string,
    ) => {
        setQuickEdits((current) => ({
            ...current,
            [product.id]: {
                ...(current[product.id] || makeQuickEditValues(product)),
                [field]: value,
            },
        }));
    };

    const openQuickEdit = (product: any, field: QuickEditField) => {
        setQuickEdits((current) => ({
            ...current,
            [product.id]: current[product.id] || makeQuickEditValues(product),
        }));
        setEditingCells((current) => ({
            ...current,
            [product.id]: {
                ...current[product.id],
                [field]: true,
            },
        }));
    };

    const closeQuickEdit = (product: any, field: QuickEditField) => {
        setEditingCells((current) => ({
            ...current,
            [product.id]: {
                ...current[product.id],
                [field]: false,
            },
        }));
    };

    const saveQuickEdit = async (product: any, field: QuickEditField) => {
        const edits = getQuickEditValues(product);
        const value = edits[field];
        const numericValue = Number(value);

        if (
            field === "price" &&
            (value.trim() === "" ||
                !Number.isFinite(numericValue) ||
                numericValue < 0)
        ) {
            toast.error("Price must be a valid non-negative number");
            return;
        }

        if (
            field === "stock" &&
            (value.trim() === "" ||
                !Number.isFinite(numericValue) ||
                numericValue < 0 ||
                !Number.isInteger(numericValue))
        ) {
            toast.error("Stock must be a valid whole number");
            return;
        }

        setSavingQuickEditKey(getQuickEditKey(product, field));
        try {
            await axios.put(`/admin/products/${product.id}`, {
                [field]: numericValue,
            });
            toast.success(`${field === "price" ? "Price" : "Stock"} updated`);
            await refetchProducts();
            closeQuickEdit(product, field);
        } catch {
            toast.error("Failed to update product");
        } finally {
            setSavingQuickEditKey(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Products</h1>
                <button
                    onClick={() => router.push("/panel-xyz123/products/new")}
                    className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    New Product
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={keyword}
                    onChange={(e) => {
                        setKeyword(e.target.value);
                        setPage(1);
                    }}
                    className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                />
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-muted-foreground">
                                <th className="text-left px-5 py-3 font-medium">Product</th>
                                <th className="text-left px-5 py-3 font-medium">Category</th>
                                <th className="text-left px-5 py-3 font-medium">Price</th>
                                <th className="text-left px-5 py-3 font-medium">Usage</th>
                                <th className="text-left px-5 py-3 font-medium">Free Item</th>
                                <th className="text-left px-5 py-3 font-medium">Stock</th>
                                <th className="text-left px-5 py-3 font-medium">Status</th>
                                <th className="text-right px-5 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-5 py-12 text-center text-muted-foreground"
                                    >
                                        <PackageX className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        No products found
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr
                                        key={product.id}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className="w-10 h-10 rounded-lg object-cover border border-border"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                        {product.name[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {product.label || product.volume || ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {product.category || "-"}
                                        </td>
                                        <td className="px-5 py-3">
                                            {isEditingField(product, "price") ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="space-y-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            inputMode="decimal"
                                                            value={getQuickEditValues(product).price}
                                                            onChange={(e) =>
                                                                updateQuickEdit(product, "price", e.target.value)
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") saveQuickEdit(product, "price");
                                                            }}
                                                            className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-medium text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                                                        />
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {formatCurrencyPreview(
                                                                getQuickEditValues(product).price,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => saveQuickEdit(product, "price")}
                                                        disabled={
                                                            savingQuickEditKey === getQuickEditKey(product, "price")
                                                        }
                                                        className="p-2 rounded-lg hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="Save price"
                                                    >
                                                        {savingQuickEditKey === getQuickEditKey(product, "price") ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Save className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-foreground">
                                                        {formatCurrency(product.price)}
                                                    </span>
                                                    <button
                                                        onClick={() => openQuickEdit(product, "price")}
                                                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                        title="Edit price"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {product.usage_days || 0} days
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {product.complimentary_product_name ? (
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {product.complimentary_product_name}
                                                    </p>
                                                    <p className="text-xs">
                                                        Qty {product.complimentary_quantity || 1}
                                                    </p>
                                                </div>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            {isEditingField(product, "stock") ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        inputMode="numeric"
                                                        value={getQuickEditValues(product).stock}
                                                        onChange={(e) =>
                                                            updateQuickEdit(product, "stock", e.target.value)
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") saveQuickEdit(product, "stock");
                                                        }}
                                                        className={`w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-medium outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 ${getStockTone(getQuickEditValues(product).stock)}`}
                                                    />
                                                    <button
                                                        onClick={() => saveQuickEdit(product, "stock")}
                                                        disabled={
                                                            savingQuickEditKey === getQuickEditKey(product, "stock")
                                                        }
                                                        className="p-2 rounded-lg hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="Save stock"
                                                    >
                                                        {savingQuickEditKey === getQuickEditKey(product, "stock") ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Save className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium ${getStockTone(product.stock)}`}>
                                                        {product.stock}
                                                    </span>
                                                    <button
                                                        onClick={() => openQuickEdit(product, "stock")}
                                                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                        title="Edit stock"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${product.is_active !== false
                                                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                                                        : "bg-red-500/10 text-red-500 border-red-500/20"
                                                    }`}
                                            >
                                                {product.is_active !== false ? "Active" : "Hidden"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() =>
                                                        toggleActive(product.id, product.is_active !== false)
                                                    }
                                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                    title={product.is_active !== false ? "Hide" : "Show"}
                                                >
                                                    {product.is_active !== false ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        router.push(
                                                            `/panel-xyz123/products/${product.id}`,
                                                        )
                                                    }
                                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
