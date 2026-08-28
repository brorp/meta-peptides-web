"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    FileUp,
    Loader2,
    MessageCircle,
    Plus,
    Save,
    Trash2,
    ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";
import { useIndonesiaRegions } from "@/hooks/use-indonesia-regions";
import { useApiQuery } from "@/hooks/api/useApiQuery";
import {
    SearchableProductSelect,
    type SearchableProductOption,
} from "@/components/admin/searchable-product-select";

type ProductOption = SearchableProductOption;

type ManualOrderItem = {
    localId: string;
    product_id: string;
    quantity: number;
    price_at_purchase: number;
};

type ParsedShopeePdfItem = {
    raw_name: string;
    quantity: number;
    product_id: string | null;
    product_name: string | null;
    price_at_purchase: number;
};

type PdfImportSummary = {
    filename: string;
    matchedItems: number;
    unmatchedItems: string[];
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

const PAYMENT_TYPES = ["Shopee", "QRIS", "Bank Transfer"];

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

/** Returns today's date in "YYYY-MM-DD" format (local timezone) */
function todayLocalDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function toLocalDate(value?: string | null) {
    if (!value) return todayLocalDate();

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return todayLocalDate();

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export default function NewManualOrderPage() {
    const router = useRouter();
    const shopeePdfInputRef = useRef<HTMLInputElement | null>(null);
    const [duplicateOrderId, setDuplicateOrderId] = useState<string | null>(null);
    const [appliedDuplicateId, setAppliedDuplicateId] = useState<string | null>(null);
    const [importingShopeePdf, setImportingShopeePdf] = useState(false);
    const [pdfImportSummary, setPdfImportSummary] =
        useState<PdfImportSummary | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        order_source: "manual_whatsapp",
        payment_type: "Bank Transfer",
        shipping_name: "",
        customer_username: "",
        shipping_phone: "",
        shipping_email: "",
        shipping_address: "",
        shipping_regional: "",
        shipping_zip: "",
        manual_reference: "",
        status: "processing",
        manual_discount_amount: "0",
        marketplace_fee: "0",
        shipment_type: "",
        shipping_fee: "0",
        note: "",
        order_date: todayLocalDate(),
    });
    const [items, setItems] = useState<ManualOrderItem[]>([buildBlankItem()]);
    const { data: productsResponse, isLoading: loadingProducts } =
        useApiQuery<any>(
            ["admin-order-product-options"],
            "/admin/products/options",
            undefined,
            { staleTime: 5 * 60 * 1000 },
        );
    const products: ProductOption[] = productsResponse?.data || [];
    const { data: duplicateResponse, isLoading: loadingDuplicate } =
        useApiQuery<any>(
            ["admin-order-duplicate", duplicateOrderId],
            duplicateOrderId ? `/admin/orders/${duplicateOrderId}` : "/admin/orders/duplicate",
            undefined,
            { enabled: Boolean(duplicateOrderId), staleTime: 0 },
        );

    const {
        provinces,
        cities,
        selectedProvinceId,
        loadingProvinces,
        loadingCities,
        cityError,
        selectProvince,
    } = useIndonesiaRegions();
    const [selectedCityDisplayName, setSelectedCityDisplayName] = useState("");

    useEffect(() => {
        setDuplicateOrderId(new URLSearchParams(window.location.search).get("duplicate"));
    }, []);

    useEffect(() => {
        if (!duplicateOrderId || appliedDuplicateId === duplicateOrderId) return;
        if (!duplicateResponse?.success) return;

        const duplicatedOrder = duplicateResponse.data;
        const source = duplicatedOrder.order_source || "manual_whatsapp";
        const paymentType =
            duplicatedOrder.payments?.[0]?.payment_type ||
            (source === "shopee" ? "Shopee" : "Bank Transfer");

        setForm({
            order_source: source,
            payment_type: PAYMENT_TYPES.includes(paymentType)
                ? paymentType
                : "Bank Transfer",
            shipping_name: duplicatedOrder.shipping_name || "",
            customer_username: duplicatedOrder.customer_username || "",
            shipping_phone: duplicatedOrder.shipping_phone || "",
            shipping_email: duplicatedOrder.shipping_email || "",
            shipping_address: duplicatedOrder.shipping_address || "",
            shipping_regional: duplicatedOrder.shipping_regional || "",
            shipping_zip: duplicatedOrder.shipping_zip || "",
            manual_reference: duplicatedOrder.manual_reference || "",
            status: duplicatedOrder.status || "processing",
            manual_discount_amount: String(
                Number(duplicatedOrder.voucher_discount_amount || 0),
            ),
            marketplace_fee: String(Number(duplicatedOrder.marketplace_fee || 0)),
            shipment_type: duplicatedOrder.shipment_type || "",
            shipping_fee: String(Number(duplicatedOrder.shipping_fee || 0)),
            note: duplicatedOrder.note || "",
            order_date: toLocalDate(duplicatedOrder.created_at),
        });

        const duplicatedItems = (duplicatedOrder.order_items || [])
            .filter((item: any) => item.product_id)
            .map((item: any) => ({
                localId: crypto.randomUUID(),
                product_id: item.product_id,
                quantity: Number(item.quantity || 1),
                price_at_purchase: Number(item.price_at_purchase || 0),
            }));

        setItems(duplicatedItems.length ? duplicatedItems : [buildBlankItem()]);
        setAppliedDuplicateId(duplicateOrderId);
        toast.success("Order copied into the form");
    }, [appliedDuplicateId, duplicateOrderId, duplicateResponse]);

    const productMap = useMemo(
        () => new Map(products.map((product) => [product.id, product])),
        [products],
    );

    const isShopee = form.order_source === "shopee";

    const subtotal = items.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.price_at_purchase || 0),
        0,
    );
    const manualDiscount = isShopee ? 0 : Math.max(0, Number(form.manual_discount_amount || 0));
    const marketplaceFee = isShopee ? Math.max(0, Number(form.marketplace_fee || 0)) : 0;
    const shipmentFee = isShopee ? 0 : Math.max(0, Number(form.shipping_fee || 0));
    const total = Math.max(0, subtotal - manualDiscount - marketplaceFee);

    const selectedSource =
        ORDER_SOURCES.find((source) => source.value === form.order_source) ||
        ORDER_SOURCES[0];

    const updateForm = (key: keyof typeof form, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const selectedProvinceName =
        provinces.find((province) => province.id === selectedProvinceId)?.nama || "";
    const shouldUseManualCityInput =
        Boolean(selectedProvinceId) &&
        !loadingCities &&
        (Boolean(cityError) || cities.length === 0);

    const updateShippingRegionalFromCity = (cityName: string) => {
        setSelectedCityDisplayName(cityName);
        updateForm(
            "shipping_regional",
            selectedProvinceName ? `${selectedProvinceName} - ${cityName}` : cityName,
        );
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

    const handleShopeePdfImport = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (form.order_source !== "shopee") {
            toast.error("PDF import is only available for Shopee orders");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        setImportingShopeePdf(true);

        try {
            const { data } = await axios.post(
                "/admin/orders/parse-shopee-label",
                formData,
            );

            if (!data.success) {
                throw new Error(data.message || "Failed to read Shopee PDF");
            }

            const parsedItems = (data.data.items || []) as ParsedShopeePdfItem[];
            const matchedItems = parsedItems.filter((item) => item.product_id);
            const unmatchedItems = parsedItems
                .filter((item) => !item.product_id)
                .map((item) => item.raw_name);

            setForm((prev) => ({
                ...prev,
                order_source: "shopee",
                payment_type: "Shopee",
                shipping_name: data.data.shipping_name || "",
                shipping_phone: "-",
                shipping_address: data.data.shipping_address || "",
                shipping_regional: data.data.shipping_regional || "",
                manual_reference: data.data.manual_reference || "",
                order_date: todayLocalDate(),
            }));

            if (matchedItems.length > 0) {
                setItems(
                    matchedItems.map((item) => ({
                        localId: crypto.randomUUID(),
                        product_id: item.product_id as string,
                        quantity: Math.max(1, Number(item.quantity || 1)),
                        price_at_purchase: Number(item.price_at_purchase || 0),
                    })),
                );
            }

            setPdfImportSummary({
                filename: file.name,
                matchedItems: matchedItems.length,
                unmatchedItems,
            });

            toast.success("Shopee PDF copied into the form", {
                description: `${matchedItems.length} product(s) matched. Please review before saving.`,
            });
        } catch (error: any) {
            setPdfImportSummary(null);
            toast.error("Failed to import Shopee PDF", {
                description: getErrorMessage(
                    error,
                    "Please use the original Shopee shipping label PDF.",
                ),
            });
        } finally {
            setImportingShopeePdf(false);
            if (shopeePdfInputRef.current) {
                shopeePdfInputRef.current.value = "";
            }
        }
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
                marketplace_fee: marketplaceFee,
                shipment_type: isShopee ? null : form.shipment_type,
                shipping_fee: shipmentFee,
                payment_type: form.payment_type,
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
                            {duplicateOrderId ? "Duplicate Order" : "Add Manual Order"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {duplicateOrderId
                                ? "Review the copied data, adjust anything needed, then create a new order."
                                : "Create a WhatsApp or Shopee order and keep it in the normal order flow."}
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

            {loadingDuplicate && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading copied order data...
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
                        <h2 className="text-sm font-semibold text-foreground">
                            Customer & Shipping
                        </h2>
                        {isShopee && (
                            <div className="rounded-2xl border border-dashed border-orange-500/30 bg-orange-500/5 p-4">
                                <input
                                    ref={shopeePdfInputRef}
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    onChange={handleShopeePdfImport}
                                    className="hidden"
                                />
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            Import Shopee Shipping Label
                                        </p>
                                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                            Auto-fills recipient, address, city, Shopee order
                                            number, today&apos;s date, and matching products.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => shopeePdfInputRef.current?.click()}
                                        disabled={importingShopeePdf}
                                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
                                    >
                                        {importingShopeePdf ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <FileUp className="h-4 w-4" />
                                        )}
                                        {importingShopeePdf ? "Reading PDF..." : "Import PDF"}
                                    </button>
                                </div>

                                {pdfImportSummary && (
                                    <div className="mt-3 space-y-2 border-t border-orange-500/15 pt-3">
                                        <div className="flex items-center gap-2 text-xs text-green-600">
                                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                                            <span>
                                                {pdfImportSummary.filename}:{" "}
                                                {pdfImportSummary.matchedItems} product(s) matched
                                            </span>
                                        </div>
                                        {pdfImportSummary.unmatchedItems.length > 0 && (
                                            <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-600">
                                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                                <div>
                                                    <p className="font-semibold">
                                                        Please select these products manually:
                                                    </p>
                                                    <p className="mt-1 leading-relaxed">
                                                        {pdfImportSummary.unmatchedItems.join(", ")}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
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
                                    Username / Handle
                                </span>
                                <input
                                    value={form.customer_username}
                                    onChange={(e) =>
                                        updateForm("customer_username", e.target.value)
                                    }
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    placeholder="Optional"
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
                                    Province
                                </span>
                                <div className="relative">
                                    <select
                                        value={selectedProvinceId}
                                        onChange={(e) => {
                                            selectProvince(e.target.value);
                                            setSelectedCityDisplayName("");
                                            updateForm("shipping_regional", "");
                                        }}
                                        disabled={loadingProvinces}
                                        className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    >
                                        <option value="">
                                            {loadingProvinces ? "Loading provinces..." : "Select province"}
                                        </option>
                                        {provinces.map((prov) => (
                                            <option key={prov.id} value={prov.id}>
                                                {prov.nama}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                </div>
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                    City / Regional
                                </span>
                                {shouldUseManualCityInput ? (
                                    <>
                                        <input
                                            value={selectedCityDisplayName}
                                            onChange={(e) =>
                                                updateShippingRegionalFromCity(e.target.value)
                                            }
                                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                            placeholder="Type city manually"
                                            required
                                        />
                                        <p className="text-[11px] text-amber-600">
                                            City lookup is temporarily unavailable. Manual city input
                                            will still save to this order.
                                        </p>
                                    </>
                                ) : (
                                    <div className="relative">
                                        <select
                                            value={selectedCityDisplayName}
                                            onChange={(e) =>
                                                updateShippingRegionalFromCity(e.target.value)
                                            }
                                            disabled={!selectedProvinceId || loadingCities}
                                            className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent disabled:opacity-60"
                                            required
                                        >
                                            <option value="">
                                                {!selectedProvinceId
                                                    ? "Select province first"
                                                    : loadingCities
                                                    ? "Loading cities..."
                                                    : "Select city"}
                                            </option>
                                            {cities.map((city) => (
                                                <option key={city.id} value={city.nama}>
                                                    {city.nama}
                                                </option>
                                            ))}
                                        </select>
                                        {loadingCities ? (
                                            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-accent" />
                                        ) : (
                                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        )}
                                    </div>
                                )}
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
                                    <SearchableProductSelect
                                        products={products}
                                        value={item.product_id}
                                        onValueChange={(productId) =>
                                            handleProductChange(item.localId, productId)
                                        }
                                        disabled={loadingProducts}
                                        loading={loadingProducts}
                                    />
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
                                onChange={(e) => {
                                    const nextSource = e.target.value;
                                    updateForm("order_source", nextSource);
                                    if (nextSource === "shopee") {
                                        updateForm("payment_type", "Shopee");
                                    } else if (form.payment_type === "Shopee") {
                                        updateForm("payment_type", "Bank Transfer");
                                    }
                                }}
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
                                Payment Type
                            </span>
                            <select
                                value={form.payment_type}
                                onChange={(e) => updateForm("payment_type", e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            >
                                {PAYMENT_TYPES.map((paymentType) => (
                                    <option key={paymentType} value={paymentType}>
                                        {paymentType}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-2 block">
                            <span className="text-xs font-medium text-muted-foreground">
                                Tanggal Pesanan
                            </span>
                            <input
                                type="date"
                                value={form.order_date}
                                onChange={(e) => updateForm("order_date", e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            />
                        </label>
                        {!isShopee && (
                            <div className="space-y-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-green-500">
                                    WhatsApp Shipment
                                </p>
                                <label className="space-y-2 block">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Shipment Type
                                    </span>
                                    <input
                                        value={form.shipment_type}
                                        onChange={(e) =>
                                            updateForm("shipment_type", e.target.value)
                                        }
                                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                        placeholder="JNE, J&T, Grab, Gojek, etc."
                                    />
                                </label>
                                <label className="space-y-2 block">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Shipment Fee
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.shipping_fee}
                                        onChange={(e) =>
                                            updateForm("shipping_fee", e.target.value)
                                        }
                                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                        placeholder="Operational cost only"
                                    />
                                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                                        If this is above 0, it creates a Shipping expense. It
                                        does not reduce or change the customer invoice total.
                                    </p>
                                </label>
                            </div>
                        )}
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

                        {/* Discount (WhatsApp only) */}
                        {!isShopee && (
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
                        )}

                        {/* Shopee Fee (Shopee only) */}
                        {isShopee && (
                            <label className="space-y-2 block">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Shopee Fee (Marketplace Fee)
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.marketplace_fee}
                                    onChange={(e) =>
                                        updateForm("marketplace_fee", e.target.value)
                                    }
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    placeholder="Biaya platform Shopee"
                                />
                            </label>
                        )}

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
                            {!isShopee && manualDiscount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Discount</span>
                                    <span className="text-green-500">
                                        -{formatCurrency(manualDiscount)}
                                    </span>
                                </div>
                            )}
                            {isShopee && marketplaceFee > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Marketplace Fee</span>
                                    <span className="text-orange-500">
                                        -{formatCurrency(marketplaceFee)}
                                    </span>
                                </div>
                            )}
                            {!isShopee && shipmentFee > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Shipment Expense
                                    </span>
                                    <span className="text-red-500">
                                        {formatCurrency(shipmentFee)}
                                    </span>
                                </div>
                            )}
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
