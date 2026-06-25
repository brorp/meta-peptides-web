"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [productOptions, setProductOptions] = useState<any[]>([]);
    const [role, setRole] = useState<AdminRole | null>(null);
    const [form, setForm] = useState<Record<string, any>>({});
    const isStaffAdmin = role === "admin";
    const canViewCostOfGoods = role === "root";
    const visibleProductFields = PRODUCT_FIELDS.filter(
        (field) => canViewCostOfGoods || field.key !== "cost_of_goods",
    );

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const { data } = await axios.get(`/admin/products/${id}`);
                if (data.success) {
                    setForm(data.data);
                    if (data.data.image_url) {
                        setImagePreview(data.data.image_url);
                    }
                }
            } catch {
                toast.error("Failed to fetch product");
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    useEffect(() => {
        const fetchAdminRole = async () => {
            try {
                const { data } = await axios.get("/admin/auth/me");
                setRole(data.data?.role || null);
            } catch {
                setRole(null);
            }
        };

        fetchAdminRole();
    }, []);

    useEffect(() => {
        const fetchProductOptions = async () => {
            try {
                const { data } = await axios.get("/admin/products", {
                    params: { page: 1, limit: 500 },
                });

                if (data.success) {
                    setProductOptions(
                        (data.data || []).filter((product: any) => product.id !== id),
                    );
                }
            } catch {
                toast.error("Failed to load product options");
            }
        };

        fetchProductOptions();
    }, [id]);

    const updateField = (key: string, value: any) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Client-side preview
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            if (form.image_url) {
                formData.append("previousUrl", form.image_url);
            }

            const { data } = await axios.post("/admin/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (data.success) {
                updateField("image_url", data.data.url);
                setImagePreview(data.data.url);
                toast.success("Image uploaded");
            } else {
                toast.error(data.message);
                // Revert preview
                setImagePreview(form.image_url || null);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to upload image");
            setImagePreview(form.image_url || null);
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeImage = () => {
        setImagePreview(null);
        updateField("image_url", "");
        if (fileInputRef.current) fileInputRef.current.value = "";
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
                {/* Image Upload Section */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-foreground">
                        Product Image
                    </h2>

                    <div className="flex items-start gap-6">
                        {/* Image Preview */}
                        <div className="relative w-40 h-40 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                            {uploading && (
                                <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-10 rounded-xl">
                                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                                </div>
                            )}
                            {imagePreview ? (
                                <>
                                    <img
                                        src={imagePreview}
                                        alt="Product"
                                        className="w-full h-full object-cover rounded-xl"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-1.5 right-1.5 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </>
                            ) : (
                                <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                            )}
                        </div>

                        {/* Upload Controls */}
                        <div className="flex flex-col gap-3 pt-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                            >
                                <Upload className="w-4 h-4" />
                                {imagePreview ? "Change Image" : "Upload Image"}
                            </button>
                            <p className="text-xs text-muted-foreground">
                                JPEG, PNG, WebP, or GIF. Max 5MB.
                            </p>
                        </div>
                    </div>
                </div>

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
