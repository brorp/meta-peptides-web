"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    ChevronDown,
    Loader2,
    Save,
    FileText,
    Package,
    Printer,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";
import { useIndonesiaRegions } from "@/hooks/use-indonesia-regions";
import { useApiQuery } from "@/hooks/api/useApiQuery";

const ORDER_STATUSES = [
    "pending_review",
    "processing",
    "completed",
    "cancelled",
];

const PAYMENT_TYPES = ["Shopee", "QRIS", "Bank Transfer"];

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending_review: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        completed: "bg-green-500/10 text-green-500 border-green-500/20",
        cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending_review
                }`}
        >
            {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
    );
}

function SourceBadge({ source }: { source?: string }) {
    if (source === "manual_whatsapp") {
        return (
            <p className="mt-1 inline-flex rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-500">
                WhatsApp Manual
            </p>
        );
    }

    if (source === "shopee") {
        return (
            <p className="mt-1 inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-500">
                Shopee
            </p>
        );
    }

    return null;
}

export default function AdminOrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const { data: orderResponse, isLoading: loading } = useApiQuery<any>(
        ["admin-order", id],
        `/admin/orders/${id}`,
    );
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
    const [status, setStatus] = useState("");
    const [orderDate, setOrderDate] = useState("");
    const [trackingNumber, setTrackingNumber] = useState("");
    const [shippingName, setShippingName] = useState("");
    const [customerUsername, setCustomerUsername] = useState("");
    const [shippingPhone, setShippingPhone] = useState("");
    const [shippingEmail, setShippingEmail] = useState("");
    const [shippingAddress, setShippingAddress] = useState("");
    const [shippingRegional, setShippingRegional] = useState("");
    const [shippingZip, setShippingZip] = useState("");

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
    const [subtotal, setSubtotal] = useState("");
    const [discountAmount, setDiscountAmount] = useState("");
    const [marketplaceFee, setMarketplaceFee] = useState("");
    const [totalPrice, setTotalPrice] = useState("");
    const [shipmentType, setShipmentType] = useState("");
    const [shippingFee, setShippingFee] = useState("");
    const [paymentType, setPaymentType] = useState("Bank Transfer");
    const trackingNumberSupported = order?._schema?.tracking_number !== false;
    const canSyncShipmentExpense = Boolean(order && order.order_source !== "shopee");
    const shipmentExpenseLabel =
        order?.order_source === "manual_whatsapp"
            ? "WhatsApp Shipment"
            : "Website Shipment";
    const selectedProvinceName =
        provinces.find((province) => province.id === selectedProvinceId)?.nama || "";
    const shouldUseManualCityInput =
        Boolean(selectedProvinceId) &&
        !loadingCities &&
        (Boolean(cityError) || cities.length === 0);

    const updateShippingRegionalFromCity = (cityName: string) => {
        setSelectedCityDisplayName(cityName);
        setShippingRegional(
            selectedProvinceName ? `${selectedProvinceName} - ${cityName}` : cityName,
        );
    };

    useEffect(() => {
        const fetchedOrder = orderResponse?.data;
        if (!fetchedOrder) return;

        setOrder(fetchedOrder);
        setStatus(fetchedOrder.status);
        const raw = fetchedOrder.created_at
            ? new Date(fetchedOrder.created_at)
            : new Date();
        const y = raw.getFullYear();
        const mo = String(raw.getMonth() + 1).padStart(2, "0");
        const d = String(raw.getDate()).padStart(2, "0");
        setOrderDate(`${y}-${mo}-${d}`);
        setTrackingNumber(
            fetchedOrder._schema?.tracking_number === false
                ? ""
                : fetchedOrder.tracking_number || "",
        );
        setShippingName(fetchedOrder.shipping_name || "");
        setCustomerUsername(fetchedOrder.customer_username || "");
        setShippingPhone(fetchedOrder.shipping_phone || "");
        setShippingEmail(fetchedOrder.shipping_email || "");
        setShippingAddress(fetchedOrder.shipping_address || "");
        setShippingRegional(fetchedOrder.shipping_regional || "");
        setShippingZip(fetchedOrder.shipping_zip || "");
        setSubtotal(String(Number(fetchedOrder.subtotal || fetchedOrder.total_price || 0)));
        setDiscountAmount(String(Number(fetchedOrder.voucher_discount_amount || 0)));
        setMarketplaceFee(String(Number(fetchedOrder.marketplace_fee || 0)));
        setTotalPrice(String(Number(fetchedOrder.total_price || 0)));
        setShipmentType(fetchedOrder.shipment_type || "");
        setShippingFee(String(Number(fetchedOrder.shipping_fee || 0)));
        setPaymentType(
            fetchedOrder.payments?.[0]?.payment_type ||
                (fetchedOrder.order_source === "shopee" ? "Shopee" : "Bank Transfer"),
        );
    }, [orderResponse]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: Record<string, any> = {
                status,
                shipping_name: shippingName,
                customer_username: customerUsername,
                shipping_phone: shippingPhone,
                shipping_email: shippingEmail,
                shipping_address: shippingAddress,
                shipping_regional: shippingRegional,
                shipping_zip: shippingZip,
                payment_type: paymentType,
            };

            // Send updated order date
            if (orderDate) {
                payload.created_at = new Date(orderDate).toISOString();
            }

            if (trackingNumberSupported && trackingNumber.trim().length > 0) {
                payload.tracking_number = trackingNumber.trim();
            }

            if (order.order_source !== "shopee") {
                payload.shipment_type = shipmentType;
                payload.shipping_fee = Number(shippingFee || 0);
            }

            if (order.order_source === "shopee") {
                payload.subtotal = Number(subtotal || 0);
                payload.voucher_discount_amount = Number(discountAmount || 0);
                payload.marketplace_fee = Number(marketplaceFee || 0);
                payload.total_price = Number(totalPrice || 0);
            }

            const { data } = await axios.put(`/admin/orders/${id}`, payload);
            if (data.success) {
                toast.success("Order updated");
                setOrder(data.data);
                const rawUpdated = data.data.created_at ? new Date(data.data.created_at) : new Date();
                const yu = rawUpdated.getFullYear();
                const mou = String(rawUpdated.getMonth() + 1).padStart(2, "0");
                const du = String(rawUpdated.getDate()).padStart(2, "0");
                setOrderDate(`${yu}-${mou}-${du}`);
                setShippingName(data.data.shipping_name || "");
                setCustomerUsername(data.data.customer_username || "");
                setShippingPhone(data.data.shipping_phone || "");
                setShippingEmail(data.data.shipping_email || "");
                setShippingAddress(data.data.shipping_address || "");
                setShippingRegional(data.data.shipping_regional || "");
                setShippingZip(data.data.shipping_zip || "");
                setSubtotal(String(Number(data.data.subtotal || data.data.total_price || 0)));
                setDiscountAmount(
                    String(Number(data.data.voucher_discount_amount || 0)),
                );
                setMarketplaceFee(String(Number(data.data.marketplace_fee || 0)));
                setTotalPrice(String(Number(data.data.total_price || 0)));
                setShipmentType(data.data.shipment_type || "");
                setShippingFee(String(Number(data.data.shipping_fee || 0)));
                setPaymentType(
                    data.data.payments?.[0]?.payment_type ||
                    (data.data.order_source === "shopee" ? "Shopee" : "Bank Transfer"),
                );
                setTrackingNumber(
                    data.data._schema?.tracking_number === false
                        ? ""
                        : data.data.tracking_number || "",
                );
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error("Failed to update order", {
                description:
                    error?.message ||
                    error?.error ||
                    "Please try again.",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleGeneratePdf = async (type: "invoice" | "packing-slip") => {
        setGeneratingPdf(type);
        try {
            const response = await axios.get(
                `/admin/orders/${id}/pdf?type=${type}`,
                { responseType: "blob" },
            );

            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${type}-${id.slice(0, 8)}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);

            toast.success(
                `${type === "invoice" ? "Invoice" : "Packing Slip"} downloaded`,
            );
        } catch {
            toast.error(`Failed to generate ${type}`);
        } finally {
            setGeneratingPdf(null);
        }
    };

    const handleDelete = async () => {
        if (
            !confirm(
                `Delete order ${order.id.slice(0, 8)}? This will remove the order, items, and payment record.`,
            )
        ) {
            return;
        }

        setDeleting(true);
        try {
            await axios.delete(`/admin/orders/${id}`);
            toast.success("Order deleted");
            router.push("/panel-xyz123/orders");
        } catch (error: any) {
            toast.error("Failed to delete order", {
                description:
                    error?.message ||
                    error?.error ||
                    "Please try again.",
            });
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center text-muted-foreground py-12">
                Order not found
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Order Detail
                        </h1>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {order.id}
                        </p>
                    </div>
                </div>
                <StatusBadge status={order.status} />
            </div>

            {/* PDF Action Buttons */}
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => handleGeneratePdf("invoice")}
                    disabled={generatingPdf !== null}
                    className="inline-flex items-center gap-2 bg-card border border-border hover:border-accent/30 hover:bg-accent/5 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground transition-all disabled:opacity-50"
                >
                    {generatingPdf === "invoice" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <FileText className="w-4 h-4 text-accent" />
                    )}
                    Generate Invoice
                </button>
                <button
                    onClick={() => handleGeneratePdf("packing-slip")}
                    disabled={generatingPdf !== null}
                    className="inline-flex items-center gap-2 bg-card border border-border hover:border-accent/30 hover:bg-accent/5 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground transition-all disabled:opacity-50"
                >
                    {generatingPdf === "packing-slip" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Printer className="w-4 h-4 text-accent" />
                    )}
                    Generate Packing Slip
                </button>
                <button
                    onClick={handleDelete}
                    disabled={deleting || generatingPdf !== null}
                    className="inline-flex items-center gap-2 bg-card border border-red-500/25 hover:border-red-500/50 hover:bg-red-500/10 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 transition-all disabled:opacity-50"
                >
                    {deleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Trash2 className="w-4 h-4" />
                    )}
                    Delete Order
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Order Items + Totals */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Items */}
                    <div className="bg-card border border-border rounded-2xl">
                        <div className="px-5 py-4 border-b border-border">
                            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Package className="w-4 h-4 text-accent" />
                                Order Items
                            </h2>
                        </div>
                        <div className="divide-y divide-border/50">
                            {(order.order_items || []).map((item: any) => (
                                <div
                                    key={item.id}
                                    className="px-5 py-4 flex items-center gap-4"
                                >
                                    {item.products?.image_url ? (
                                        <img
                                            src={item.products.image_url}
                                            alt={item.products?.name}
                                            className="w-12 h-12 rounded-lg object-cover border border-border"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                            {(item.products?.name || "P")[0]}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground text-sm truncate">
                                            {item.products?.name || "Unknown Product"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <p className="text-xs text-muted-foreground">
                                                {Number(item.price_at_purchase) === 0
                                                    ? `FREE × ${item.quantity}`
                                                    : `${formatCurrency(item.price_at_purchase)} × ${item.quantity}`}
                                            </p>
                                            {Number(item.price_at_purchase) === 0 && (
                                                <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700">
                                                    Complimentary Item
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p
                                        className={`font-medium text-sm ${Number(item.price_at_purchase) === 0
                                                ? "text-green-600"
                                                : "text-foreground"
                                            }`}
                                    >
                                        {Number(item.price_at_purchase) === 0
                                            ? "FREE"
                                            : formatCurrency(item.price_at_purchase * item.quantity)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="px-5 py-4 border-t border-border space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="text-foreground">
                                    {formatCurrency(order.subtotal || order.total_price)}
                                </span>
                            </div>
                            {Number(order.voucher_discount_amount || 0) > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Discount{order.voucher_code ? ` (${order.voucher_code})` : ""}
                                    </span>
                                    <span className="text-green-500">
                                        -{formatCurrency(order.voucher_discount_amount)}
                                    </span>
                                </div>
                            )}
                            {Number(order.marketplace_fee || 0) > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Marketplace Fee</span>
                                    <span className="text-orange-500">
                                        -{formatCurrency(order.marketplace_fee)}
                                    </span>
                                </div>
                            )}
                            {canSyncShipmentExpense &&
                                Number(order.shipping_fee || 0) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Shipment Expense
                                            {order.shipment_type
                                                ? ` (${order.shipment_type})`
                                                : ""}
                                        </span>
                                        <span className="text-red-500">
                                            {formatCurrency(order.shipping_fee)}
                                        </span>
                                    </div>
                                )}
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-foreground">Total</span>
                                <span className="text-accent">
                                    {formatCurrency(order.total_price)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Info */}
                    {order.payments && order.payments.length > 0 && (
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                            <h2 className="text-sm font-semibold text-foreground">
                                Payment Info
                            </h2>
                            {order.payments.map((payment: any) => (
                                <div key={payment.id} className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Transaction Code
                                        </span>
                                        <span className="text-foreground font-mono text-xs">
                                            {payment.transaction_code}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Payment Type</span>
                                        <span className="text-foreground">
                                            {payment.payment_type || "Bank Transfer"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Status</span>
                                        <span className="text-foreground capitalize">
                                            {payment.status}
                                        </span>
                                    </div>
                                    {payment.receipt_url && (
                                        <a
                                            href={payment.receipt_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block text-accent hover:underline text-xs"
                                        >
                                            View Receipt →
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Customer + Status */}
                <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">
                                Customer & Shipping
                            </h2>
                            <p className="text-xs text-muted-foreground mt-1">
                                Edit these fields, then use Save Changes below.
                            </p>
                        </div>
                        <label className="block space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Customer Name
                            </span>
                            <input
                                value={shippingName}
                                onChange={(e) => setShippingName(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            />
                        </label>
                        <label className="block space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Username
                            </span>
                            <input
                                value={customerUsername}
                                onChange={(e) => setCustomerUsername(e.target.value)}
                                placeholder="Shopee username or customer handle"
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            />
                        </label>
                        <label className="block space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Phone
                            </span>
                            <input
                                value={shippingPhone}
                                onChange={(e) => setShippingPhone(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            />
                        </label>
                        <label className="block space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Email
                            </span>
                            <input
                                type="email"
                                value={shippingEmail}
                                onChange={(e) => setShippingEmail(e.target.value)}
                                placeholder="Optional"
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            />
                        </label>
                        <label className="block space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Province
                            </span>
                            <div className="relative">
                                <select
                                    value={selectedProvinceId}
                                    onChange={(e) => {
                                        selectProvince(e.target.value);
                                        setSelectedCityDisplayName("");
                                        setShippingRegional("");
                                    }}
                                    disabled={loadingProvinces}
                                    className="w-full appearance-none bg-background border border-border rounded-xl py-2.5 px-3 pr-10 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
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
                        <label className="block space-y-1.5">
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
                                        placeholder="Type city manually"
                                        className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
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
                                        className="w-full appearance-none bg-background border border-border rounded-xl py-2.5 px-3 pr-10 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all disabled:opacity-60"
                                    >
                                        <option value="">
                                            {!selectedProvinceId
                                                ? `Current: ${shippingRegional || "—"}`
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
                            {shippingRegional && !selectedProvinceId && (
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Current value: <span className="font-medium text-foreground">{shippingRegional}</span>. Select a province above to change it.
                                </p>
                            )}
                        </label>
                        <label className="block space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                ZIP / Postal Code
                            </span>
                            <input
                                value={shippingZip}
                                onChange={(e) => setShippingZip(e.target.value)}
                                placeholder="Optional"
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            />
                        </label>
                        <label className="block space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                Full Address
                            </span>
                            <textarea
                                value={shippingAddress}
                                onChange={(e) => setShippingAddress(e.target.value)}
                                className="min-h-24 w-full resize-none bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            />
                        </label>
                    </div>

                    {/* Status & Tracking */}
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                        <h2 className="text-sm font-semibold text-foreground">
                            Update Order
                        </h2>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Tanggal Pesanan
                            </label>
                            <input
                                type="date"
                                value={orderDate}
                                onChange={(e) => setOrderDate(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            >
                                {ORDER_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Payment Type
                            </label>
                            <select
                                value={paymentType}
                                onChange={(e) => setPaymentType(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            >
                                {PAYMENT_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {canSyncShipmentExpense && (
                            <div className="space-y-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-green-500">
                                    {shipmentExpenseLabel}
                                </p>
                                <label className="block space-y-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Shipment Type
                                    </span>
                                    <input
                                        type="text"
                                        value={shipmentType}
                                        onChange={(e) => setShipmentType(e.target.value)}
                                        placeholder="JNE, J&T, Grab, Gojek, etc."
                                        className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                    />
                                </label>
                                <label className="block space-y-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Shipment Fee
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={shippingFee}
                                        onChange={(e) => setShippingFee(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                    />
                                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                                        Positive fees sync to Expenses as Shipping and do not
                                        affect invoice total.
                                    </p>
                                </label>
                            </div>
                        )}

                        {trackingNumberSupported && (
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                    Tracking Number
                                </label>
                                <input
                                    type="text"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="e.g., JNE1234567890"
                                    className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                />
                            </div>
                        )}

                        {order.order_source === "shopee" && (
                            <div className="space-y-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                                    Shopee Financials
                                </p>
                                <label className="block space-y-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Subtotal
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={subtotal}
                                        onChange={(e) => setSubtotal(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                    />
                                </label>
                                <label className="block space-y-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Discount Total
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                    />
                                </label>
                                <label className="block space-y-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Shopee Fee (Marketplace Fee)
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={marketplaceFee}
                                        onChange={(e) => setMarketplaceFee(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                    />
                                </label>
                                <label className="block space-y-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Final Total / Income
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={totalPrice}
                                        onChange={(e) => setTotalPrice(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                    />
                                </label>
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Save Changes
                        </button>
                    </div>

                    {/* Order Meta */}
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tanggal Pesanan</span>
                            <span className="text-foreground text-xs">
                                {formatDate(order.created_at)}
                            </span>
                        </div>
                        {order.voucher_code && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Voucher</span>
                                <span className="text-accent font-medium text-xs">
                                    {order.voucher_code}
                                </span>
                            </div>
                        )}
                        {order.order_source && order.order_source !== "checkout" && (
                            <div>
                                <span className="text-muted-foreground text-xs">
                                    Order Source
                                </span>
                                <SourceBadge source={order.order_source} />
                            </div>
                        )}
                        {order.manual_reference && (
                            <div>
                                <span className="text-muted-foreground text-xs">
                                    {order.order_source === "shopee"
                                        ? "Shopee Order No."
                                        : "Manual Reference"}
                                </span>
                                <p className="text-foreground text-xs mt-1">
                                    {order.manual_reference}
                                </p>
                            </div>
                        )}
                        {order.note && (
                            <div>
                                <span className="text-muted-foreground text-xs">Note</span>
                                <p className="text-foreground text-xs mt-1">{order.note}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
