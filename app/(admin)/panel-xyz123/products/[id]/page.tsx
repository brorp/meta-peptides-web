"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";
import { useApiQuery } from "@/hooks/api/useApiQuery";
import { ProductImageGalleryField } from "@/components/admin/product-image-gallery-field";
import { normalizeProductImages } from "@/lib/product-images";

const PRODUCT_FIELDS = [
    { key: "name", label: "Product Name", required: true },
    { key: "label", label: "Label / Subtitle" },
    { key: "slug", label: "Slug" },
    { key: "price", label: "Price (IDR)", type: "number", required: true },
    { key: "cost_of_goods", label: "COGS / Unit (IDR)", type: "number" },
    { key: "original_price", label: "Original Price (IDR)", type: "number" },
    { key: "stock", label: "Stock Quantity", type: "number", required: true },
    { key: "usage_days", label: "Masa Pakai (Days)", type: "number" },
    { key: "volume", label: "Volume / Size" },
    { key: "purity", label: "Purity %" },
    { key: "formula", label: "Chemical Formula" },
    { key: "cas", label: "CAS Number" },
    { key: "category", label: "Category" },
];

const TEXTAREA_FIELDS = [
    { key: "short_desc", label: "Short Description" },
    { key: "overview", label: "Overview" },
    { key: "storage_instruction", label: "Storage Instruction" },
    { key: "usage_instruction", label: "Usage Instruction" },
    { key: "dosing", label: "Dosing" },
];

type AdminRole = "root" | "admin";

export default function EditProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState<Record<string, any>>({});
    const { data: authResponse } = useApiQuery<any>(
        ["admin-auth-me"],
        "/admin/auth/me",
        undefined,
        { staleTime: 5 * 60 * 1000 },
    );
    const { data: productResponse, isLoading: loading } = useApiQuery<any>(
        ["admin-product", id],
        `/admin/products/${id}`,
    );
    const { data: productOptionsResponse } = useApiQuery<any>(
        ["admin-product-options"],
        "/admin/products",
        { params: { page: 1, limit: 500 } },
        { staleTime: 5 * 60 * 1000 },
    );
    const role: AdminRole | null = authResponse?.data?.role || null;
    const productOptions: any[] = (productOptionsResponse?.data || []).filter(
        (product: any) => product.id !== id,
    );
    const isStaffAdmin = role === "admin";
    const canViewCostOfGoods = role === "root";
    const visibleProductFields = PRODUCT_FIELDS.filter(
        (field) => canViewCostOfGoods || field.key !== "cost_of_goods",
    );

    useEffect(() => {
        const product = productResponse?.data;
        if (!product) return;

        const images = normalizeProductImages(
            product.image_urls,
            product.image_url,
        );
        setForm({
            ...product,
            image_urls: images,
            image_url: images[0] || "",
        });
    }, [productResponse]);

    const updateField = (key: string, value: any) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const updateImages = (images: string[]) => {
        setForm((prev) => ({
            ...prev,
            image_urls: images,
            image_url: images[0] || "",
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form };
            if (isStaffAdmin) delete payload.cost_of_goods;

            const { data } = await axios.put(`/admin/products/${id}`, payload);
            if (data.success) {
                toast.success("Product updated");
                router.push("/panel-xyz123/products");
            } else {
                toast.error(data.message);
            }
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to update product",
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="text-2xl font-bold text-foreground">Edit Product</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <ProductImageGalleryField
                    images={form.image_urls || []}
                    onChange={updateImages}
                    onUploadingChange={setUploading}
                />

                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-foreground">
                        Product Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visibleProductFields.map((field) => (
                            <div key={field.key}>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                    {field.label}
                                    {field.required && (
                                        <span className="text-destructive ml-0.5">*</span>
                                    )}
                                </label>
                                {field.key === "category" ? (
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            {(form.category || "").split(',').map((c: string) => c.trim()).filter(Boolean).map((cat: string, idx: number) => (
                                                <span key={idx} className="inline-flex items-center gap-1 bg-accent/10 px-2 py-1 rounded-md text-xs font-medium text-accent">
                                                    {cat}
                                                    <button type="button" onClick={() => {
                                                        const newCats = (form.category || "").split(',').map((c: string) => c.trim()).filter(Boolean).filter((c: string) => c !== cat);
                                                        updateField('category', newCats.join(', '));
                                                    }} className="text-accent hover:text-accent/80"><X className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Type and press Enter"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ',') {
                                                    e.preventDefault();
                                                    const val = e.currentTarget.value.trim();
                                                    if (val) {
                                                        const current = (form.category || "").split(',').map((c: string) => c.trim()).filter(Boolean);
                                                        if (!current.includes(val)) {
                                                            updateField('category', [...current, val].join(', '));
                                                        }
                                                        e.currentTarget.value = "";
                                                    }
                                                }
                                            }}
                                            className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                        />
                                    </div>
                                ) : (
                                    <input
                                        type={field.type || "text"}
                                        value={form[field.key] ?? ""}
                                        onChange={(e) => updateField(field.key, e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-foreground">
                        Complimentary Item
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Free Item Product
                            </label>
                            <select
                                value={form.complimentary_product_id || ""}
                                onChange={(e) =>
                                    updateField("complimentary_product_id", e.target.value)
                                }
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            >
                                <option value="">No complimentary item</option>
                                {productOptions.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Free Item Quantity
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={form.complimentary_quantity ?? "1"}
                                onChange={(e) =>
                                    updateField("complimentary_quantity", e.target.value)
                                }
                                disabled={!form.complimentary_product_id}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        The selected free item will be added automatically at checkout
                        for this product.
                    </p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-foreground">
                        Descriptions & Instructions
                    </h2>

                    {TEXTAREA_FIELDS.map((field) => (
                        <div key={field.key}>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                {field.label}
                            </label>
                            <textarea
                                value={form[field.key] ?? ""}
                                onChange={(e) => updateField(field.key, e.target.value)}
                                rows={3}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all resize-none"
                            />
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.is_active !== false}
                            onChange={(e) => updateField("is_active", e.target.checked)}
                            className="rounded border-border text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-foreground">
                            Active (visible on storefront)
                        </span>
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={saving || uploading}
                    className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    Save Changes
                </button>
            </form>
        </div>
    );
}
