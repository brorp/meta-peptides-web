"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Eye, ShoppingCart, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

const STATUS_TABS = [
    { label: "All", value: "" },
    { label: "Pending", value: "pending_review" },
    { label: "Processing", value: "processing" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
];

const ORDER_STATUS_OPTIONS = STATUS_TABS.filter((tab) => tab.value);

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
        month: "short",
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
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending_review
                }`}
        >
            {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
    );
}

function SourceBadge({ source }: { source?: string }) {
    if (source === "manual_whatsapp") {
        return (
            <span className="inline-flex rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-500">
                WhatsApp
            </span>
        );
    }

    if (source === "shopee") {
        return (
            <span className="inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-500">
                Shopee
            </span>
        );
    }

    return null;
}

export default function AdminOrdersPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/admin/orders", {
                params: { page, limit: 20, keyword, status },
            });
            if (data.success) {
                setOrders(data.data || []);
                setTotalPages(data.pagination?.total_pages || 1);
            }
        } catch {
            toast.error("Failed to fetch orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [page, keyword, status]);

    const handleShopeeImport = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setImporting(true);
        try {
            const { data } = await axios.post("/admin/orders/import-shopee", formData);
            const result = data.data;
            const importedCount =
                Number(result?.created || 0) + Number(result?.updated || 0);
            const errorCount = Number(result?.errors?.length || 0);

            toast.success("Shopee XLSX imported", {
                description: `${importedCount} order(s) synced. ${errorCount} error(s).`,
            });

            setPage(1);
            fetchOrders();
        } catch (error: any) {
            toast.error("Failed to import Shopee XLSX", {
                description:
                    error?.message ||
                    error?.error?.errors?.[0]?.message ||
                    "Please check the file and try again.",
            });
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const updateOrderStatus = async (orderId: string, nextStatus: string) => {
        setOrders((prev) =>
            prev.map((order) =>
                order.id === orderId ? { ...order, status: nextStatus } : order,
            ),
        );

        try {
            const { data } = await axios.put(`/admin/orders/${orderId}`, {
                status: nextStatus,
            });

            if (!data.success) {
                throw new Error(data.message || "Failed to update order status");
            }

            toast.success("Order status updated");
            if (status && status !== nextStatus) fetchOrders();
        } catch (error: any) {
            toast.error("Failed to update order status", {
                description:
                    error?.response?.data?.message ||
                    error?.message ||
                    "Please try again.",
            });
            fetchOrders();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Orders</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage checkout, WhatsApp manual, and Shopee orders.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleShopeeImport}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
                    >
                        {importing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4" />
                        )}
                        Import Shopee XLSX
                    </button>
                    <button
                        onClick={() => router.push("/panel-xyz123/orders/new")}
                        className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Manual Order
                    </button>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => {
                            setStatus(tab.value);
                            setPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${status === tab.value
                                ? "bg-accent/10 text-accent border-accent/30"
                                : "bg-card text-muted-foreground border-border hover:border-accent/20"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by name, email, or Shopee order no..."
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
                                <th className="text-left px-5 py-3 font-medium">Order ID</th>
                                <th className="text-left px-5 py-3 font-medium">Customer</th>
                                <th className="text-left px-5 py-3 font-medium">Items</th>
                                <th className="text-left px-5 py-3 font-medium">Total</th>
                                <th className="text-left px-5 py-3 font-medium">Status</th>
                                <th className="text-left px-5 py-3 font-medium">Date</th>
                                <th className="text-right px-5 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-5 py-12 text-center text-muted-foreground"
                                    >
                                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        No orders found
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order: any) => (
                                    <tr
                                        key={order.id}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                                        onClick={() =>
                                            router.push(`/panel-xyz123/orders/${order.id}`)
                                        }
                                    >
                                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                                            <div className="space-y-1">
                                                <p>{order.id.slice(0, 8)}...</p>
                                                <SourceBadge source={order.order_source} />
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div>
                                                <p className="text-foreground font-medium">
                                                    {order.shipping_name || "Guest"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {order.customer_username
                                                        ? `@${order.customer_username}`
                                                        : order.shipping_email || ""}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {order.order_items?.length || 0} item(s)
                                        </td>
                                        <td className="px-5 py-3 text-foreground font-medium">
                                            {formatCurrency(order.total_price)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <select
                                                value={order.status}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) =>
                                                    updateOrderStatus(order.id, e.target.value)
                                                }
                                                className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                                            >
                                                {ORDER_STATUS_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground text-xs">
                                            {formatDate(order.created_at)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/panel-xyz123/orders/${order.id}`);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
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
