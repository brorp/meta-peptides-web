"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    MessageCircle,
    Plus,
    Save,
    Trash2,
    ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

type ProductOption = {
    id: string;
    name: string;
    label?: string | null;
    price: number;
};

type ManualOrderItem = {
    localId: string;
    product_id: string;
    quantity: number;
    price_at_purchase: number;
};

const ORDER_STATUSES = [
    { label: "Pending Review", value: "pending_review" },
    { label: "Processing", value: "processing" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
];

const ORDER_SOURCES = [
    {
        label: "WhatsApp Manual",
        value: "manual_whatsapp",
        badgeClass: "border-green-500/20 bg-green-500/10 text-green-500",
    },
    {
        label: "Shopee",
        value: "shopee",
        badgeClass: "border-orange-500/20 bg-orange-500/10 text-orange-500",
    },
];

const buildBlankItem = (): ManualOrderItem => ({
    localId: crypto.randomUUID(),
    product_id: "",
    quantity: 1,
    price_at_purchase: 0,
});

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value || 0);
}

function getErrorMessage(error: any, fallback: string) {
    return error?.message || error?.error || fallback;
}

export default function NewManualOrderPage() {
    const router = useRouter();
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        order_source: "manual_whatsapp",
        shipping_name: "",
        shipping_phone: "",
        shipping_email: "",
        shipping_address: "",
        shipping_regional: "",
        shipping_zip: "",
        manual_reference: "",
        status: "processing",
        manual_discount_amount: "0",
        note: "",
    });
    const [items, setItems] = useState<ManualOrderItem[]>([buildBlankItem()]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data } = await axios.get("/admin/products", {
                    params: { page: 1, limit: 200 },
                });

                if (data.success) {
                    setProducts(data.data || []);
                }
            } catch (error: any) {
                toast.error("Failed to load products", {
                    description: getErrorMessage(error, "Please try again."),
                });
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchProducts();
    }, []);

    const productMap = useMemo(
        () => new Map(products.map((product) => [product.id, product])),
        [products],
    );

    const subtotal = items.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.price_at_purchase || 0),
        0,
    );
    const manualDiscount = Math.max(0, Number(form.manual_discount_amount || 0));
    const total = Math.max(0, subtotal - manualDiscount);
    const selectedSource =
        ORDER_SOURCES.find((source) => source.value === form.order_source) ||
        ORDER_SOURCES[0];

    const updateForm = (key: keyof typeof form, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const updateItem = (
        localId: string,
        patch: Partial<Omit<ManualOrderItem, "localId">>,
    ) => {
        setItems((prev) =>
            prev.map((item) =>
                item.localId === localId ? { ...item, ...patch } : item,
            ),
        );
    };

    const handleProductChange = (localId: string, productId: string) => {
        const product = productMap.get(productId);
        updateItem(localId, {
            product_id: productId,
            price_at_purchase: Number(product?.price || 0),
        });
    };

    const addItem = () => {
        setItems((prev) => [...prev, buildBlankItem()]);
    };

    const removeItem = (localId: string) => {
        setItems((prev) =>
            prev.length > 1
                ? prev.filter((item) => item.localId !== localId)
                : [buildBlankItem()],
        );
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const payloadItems = items
            .filter((item) => item.product_id)
            .map((item) => ({
                product_id: item.product_id,
                quantity: Number(item.quantity || 0),
                price_at_purchase: Number(item.price_at_purchase || 0),
            }));

        if (!payloadItems.length) {
            toast.error("Please add at least one product");
            return;
        }

        setSaving(true);
        try {
            const { data } = await axios.post("/admin/orders", {
                ...form,
                manual_discount_amount: manualDiscount,
                items: payloadItems,
            });

            if (data.success) {
                toast.success(`${selectedSource.label} order created`);
                router.push(`/panel-xyz123/orders/${data.data.id}`);
            }
        } catch (error: any) {
            toast.error("Failed to create manual order", {
                description: getErrorMessage(error, "Please review the order data."),
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Add Manual Order
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Create a WhatsApp or Shopee order and keep it in the normal order flow.
                        </p>
                    </div>
                </div>
                <div
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${selectedSource.badgeClass}`}
                >
                    {selectedSource.value === "shopee" ? (
                        <ShoppingBag className="w-4 h-4" />
                    ) : (
                        <MessageCircle className="w-4 h-4" />
                    )}
                    {selectedSource.label}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
                        <h2 className="text-sm font-semibold text-foreground">
                            Customer & Shipping
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Customer Name
                                </span>
                                <input
                                    value={form.shipping_name}
                                    onChange={(e) => updateForm("shipping_name", e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    required
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                    WhatsApp Number
                                </span>
                                <input
                                    value={form.shipping_phone}
                                    onChange={(e) => updateForm("shipping_phone", e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    required
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Email
                                </span>
                                <input
                                    type="email"
                                    value={form.shipping_email}
                                    onChange={(e) => updateForm("shipping_email", e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    placeholder="Optional"
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                    City / Regional
                                </span>
                                <input
                                    value={form.shipping_regional}
                                    onChange={(e) => updateForm("shipping_regional", e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    required
                                />
                            </label>
                            <label className="space-y-2 md:col-span-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Full Address
                                </span>
                                <textarea
                                    value={form.shipping_address}
                                    onChange={(e) => updateForm("shipping_address", e.target.value)}
                                    className="min-h-24 w-full resize-none bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    required
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                    ZIP / Postal Code
                                </span>
                                <input
                                    value={form.shipping_zip}
                                    onChange={(e) => updateForm("shipping_zip", e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    placeholder="Optional"
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                    {form.order_source === "shopee"
                                        ? "Shopee Order No."
                                        : "WhatsApp Reference"}
                                </span>
                                <input
                                    value={form.manual_reference}
                                    onChange={(e) => updateForm("manual_reference", e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    placeholder={
                                        form.order_source === "shopee"
                                            ? "No. Pesanan"
                                            : "WA chat/order code"
                                    }
                                />
                            </label>
                        </div>
                    </section>

                    <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-foreground">
                                Order Items
                            </h2>
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item) => (
                                <div
                                    key={item.localId}
                                    className="grid gap-3 rounded-xl border border-border bg-background p-3 md:grid-cols-[1fr_110px_150px_40px]"
                                >
                                    <select
                                        value={item.product_id}
                                        onChange={(e) =>
                                            handleProductChange(item.localId, e.target.value)
                                        }
                                        disabled={loadingProducts}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                        required
                                    >
                                        <option value="">
                                            {loadingProducts ? "Loading products..." : "Select product"}
                                        </option>
                                        {products.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name}
                                                {product.label ? ` (${product.label})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) =>
                                            updateItem(item.localId, {
                                                quantity: Number(e.target.value || 1),
                                            })
                                        }
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                        required
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        value={item.price_at_purchase}
                                        onChange={(e) =>
                                            updateItem(item.localId, {
                                                price_at_purchase: Number(e.target.value || 0),
                                            })
                                        }
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeItem(item.localId)}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
                        <h2 className="text-sm font-semibold text-foreground">
                            Order Settings
                        </h2>
                        <label className="space-y-2 block">
                            <span className="text-xs font-medium text-muted-foreground">
                                Order Source
                            </span>
                            <select
                                value={form.order_source}
                                onChange={(e) => updateForm("order_source", e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            >
                                {ORDER_SOURCES.map((source) => (
                                    <option key={source.value} value={source.value}>
                                        {source.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-2 block">
                            <span className="text-xs font-medium text-muted-foreground">
                                Initial Status
                            </span>
                            <select
                                value={form.status}
                                onChange={(e) => updateForm("status", e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            >
                                {ORDER_STATUSES.map((status) => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-2 block">
                            <span className="text-xs font-medium text-muted-foreground">
                                Manual Discount
                            </span>
                            <input
                                type="number"
                                min="0"
                                value={form.manual_discount_amount}
                                onChange={(e) =>
                                    updateForm("manual_discount_amount", e.target.value)
                                }
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            />
                        </label>
                        <label className="space-y-2 block">
                            <span className="text-xs font-medium text-muted-foreground">
                                Internal Note
                            </span>
                            <textarea
                                value={form.note}
                                onChange={(e) => updateForm("note", e.target.value)}
                                className="min-h-28 w-full resize-none bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                placeholder="Payment note, WhatsApp context, or handling detail"
                            />
                        </label>
                    </section>

                    <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
                        <h2 className="text-sm font-semibold text-foreground">
                            Summary
                        </h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="text-foreground">
                                    {formatCurrency(subtotal)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Discount</span>
                                <span className="text-green-500">
                                    -{formatCurrency(manualDiscount)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-border pt-3 font-bold">
                                <span className="text-foreground">Total</span>
                                <span className="text-accent">{formatCurrency(total)}</span>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={saving || loadingProducts}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:bg-accent/90 disabled:opacity-60"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Create Manual Order
                        </button>
                    </section>
                </aside>
            </form>
        </div>
    );
}
