"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    Save,
    FileText,
    Package,
    Printer,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

const ORDER_STATUSES = [
    "pending_review",
    "processing",
    "shipped",
    "completed",
    "cancelled",
];

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
        shipped: "bg-purple-500/10 text-purple-500 border-purple-500/20",
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

export default function AdminOrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
    const [status, setStatus] = useState("");
    const [trackingNumber, setTrackingNumber] = useState("");

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const { data } = await axios.get(`/admin/orders/${id}`);
                if (data.success) {
                    setOrder(data.data);
                    setStatus(data.data.status);
                    setTrackingNumber(data.data.tracking_number || "");
                }
            } catch {
                toast.error("Failed to fetch order");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await axios.put(`/admin/orders/${id}`, {
                status,
                tracking_number: trackingNumber,
            });
            if (data.success) {
                toast.success("Order updated");
                setOrder(data.data);
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error("Failed to update order");
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
                                        <p className="text-xs text-muted-foreground">
                                            {formatCurrency(item.price_at_purchase)} × {item.quantity}
                                        </p>
                                    </div>
                                    <p className="font-medium text-foreground text-sm">
                                        {formatCurrency(item.price_at_purchase * item.quantity)}
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
                        <h2 className="text-sm font-semibold text-foreground">Customer</h2>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-muted-foreground text-xs">Name</span>
                                <p className="text-foreground font-medium">
                                    {order.shipping_name || "-"}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs">Phone</span>
                                <p className="text-foreground">{order.shipping_phone || "-"}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs">Email</span>
                                <p className="text-foreground">{order.shipping_email || "-"}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs">Address</span>
                                <p className="text-foreground text-xs leading-relaxed">
                                    {order.shipping_address}
                                    {order.shipping_regional &&
                                        `, ${order.shipping_regional}`}
                                    {order.shipping_zip && ` ${order.shipping_zip}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Status & Tracking */}
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                        <h2 className="text-sm font-semibold text-foreground">
                            Update Order
                        </h2>

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
                            <span className="text-muted-foreground">Created</span>
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
