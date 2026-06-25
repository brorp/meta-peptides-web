"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Copy,
    Crown,
    Eye,
    Loader2,
    PackageSearch,
    PieChart as PieChartIcon,
    Plus,
    Search,
    ShoppingCart,
    TrendingUp,
    Truck,
    Upload,
    Users,
} from "lucide-react";
import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
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
const ANALYTICS_RANGES = [
    { label: "This Month", value: "this_month" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "this_week" },
    { label: "90 Days", value: "90_days" },
];
const DOMICILE_COLORS = [
    "#22c55e",
    "#f97316",
    "#38bdf8",
    "#a3e635",
    "#eab308",
    "#ec4899",
];

type SortBy =
    | "created_at"
    | "shipping_name"
    | "total_price"
    | "status"
    | "order_source"
    | "shipping_fee";
type SortDir = "asc" | "desc";
type DomicileDistribution = {
    label: string;
    value: number;
    revenue: number;
};
type OrdersAnalytics = {
    orderCount: number;
    unitsSold: number;
    totalRevenue: number;
    averageOrderValue: number;
    uniqueCustomers: number;
    totalShipmentFees: number;
    topSpender: { name: string; total: number; orders: number } | null;
    bestSeller: {
        productId: string;
        name: string;
        label: string | null;
        units: number;
        revenue: number;
    } | null;
    bestSellers: Array<{
        productId: string;
        name: string;
        label: string | null;
        units: number;
        revenue: number;
    }>;
    topSpenders: Array<{ name: string; total: number; orders: number }>;
    domicileDistribution: DomicileDistribution[];
    shipmentBreakdown: Array<{ label: string; orders: number; fees: number }>;
};

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

function formatNumber(value: number) {
    return new Intl.NumberFormat("id-ID").format(value || 0);
}

function getErrorMessage(error: any, fallback: string) {
    return error?.response?.data?.message || error?.message || fallback;
}

function summarizeDomiciles(distribution: DomicileDistribution[]) {
    const topDomiciles = distribution.slice(0, 5);
    const remaining = distribution.slice(5);

    if (remaining.length === 0) return topDomiciles;

    return [
        ...topDomiciles,
        remaining.reduce(
            (summary, domicile) => ({
                label: "OTHERS",
                value: summary.value + domicile.value,
                revenue: summary.revenue + domicile.revenue,
            }),
            { label: "OTHERS", value: 0, revenue: 0 },
        ),
    ];
}

function AnalyticsMetric({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: string;
    icon: any;
    tone: string;
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-muted-foreground">
                        {label}
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
                </div>
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
                >
                    <Icon className="h-4 w-4" />
                </div>
            </div>
        </div>
    );
}

function SortableHeader({
    label,
    field,
    sortBy,
    sortDir,
    onSort,
}: {
    label: string;
    field: SortBy;
    sortBy: SortBy;
    sortDir: SortDir;
    onSort: (field: SortBy) => void;
}) {
    const active = sortBy === field;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;

    return (
        <button
            type="button"
            onClick={() => onSort(field)}
            className={`inline-flex items-center gap-1.5 transition-colors hover:text-foreground ${active ? "text-foreground" : "text-muted-foreground"
                }`}
        >
            {label}
            <Icon className="h-3.5 w-3.5" />
        </button>
    );
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
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);
    const [importing, setImporting] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [analyticsRange, setAnalyticsRange] = useState("this_month");
    const [analytics, setAnalytics] = useState<OrdersAnalytics | null>(null);
    const [sortBy, setSortBy] = useState<SortBy>("created_at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const domicileChartData = summarizeDomiciles(
        analytics?.domicileDistribution || [],
    );
    const domicileOrderTotal = domicileChartData.reduce(
        (total, domicile) => total + domicile.value,
        0,
    );

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/admin/orders", {
                params: {
                    page,
                    limit: 20,
                    keyword,
                    status,
                    sort_by: sortBy,
                    sort_dir: sortDir,
                },
            });
            if (data.success) {
                setOrders(data.data || []);
                setTotalPages(data.pagination?.total_pages || 1);
            }
        } catch (error: any) {
            toast.error("Failed to fetch orders", {
                description: getErrorMessage(error, "Please try again."),
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [page, keyword, status, sortBy, sortDir]);

    const fetchAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
            const { data } = await axios.get("/admin/orders/analytics", {
                params: { range: analyticsRange },
            });
            if (data.success) setAnalytics(data.data);
        } catch {
            toast.error("Failed to fetch order analytics");
        } finally {
            setLoadingAnalytics(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [analyticsRange]);

    const handleSort = (field: SortBy) => {
        setPage(1);
        if (field === sortBy) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
            return;
        }

        setSortBy(field);
        setSortDir(field === "created_at" || field === "total_price" ? "desc" : "asc");
    };

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
            fetchAnalytics();
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
            fetchAnalytics();
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

            <section className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">
                            Order Overview
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-foreground">
                            Sales pulse and customer signals
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Active orders only: processing and completed.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {ANALYTICS_RANGES.map((range) => (
                            <button
                                key={range.value}
                                type="button"
                                onClick={() => setAnalyticsRange(range.value)}
                                className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${analyticsRange === range.value
                                        ? "border-accent/40 bg-accent/10 text-accent"
                                        : "border-border bg-background text-muted-foreground hover:border-accent/30 hover:text-foreground"
                                    }`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loadingAnalytics ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[...Array(4)].map((_, index) => (
                            <div
                                key={index}
                                className="h-24 animate-pulse rounded-2xl border border-border bg-background"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="mt-5 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <AnalyticsMetric
                                label="Revenue"
                                value={formatCurrency(analytics?.totalRevenue || 0)}
                                icon={TrendingUp}
                                tone="bg-emerald-500/10 text-emerald-500"
                            />
                            <AnalyticsMetric
                                label="Products Sold"
                                value={`${formatNumber(analytics?.unitsSold || 0)} units`}
                                icon={PackageSearch}
                                tone="bg-sky-500/10 text-sky-500"
                            />
                            <AnalyticsMetric
                                label="Top Spender"
                                value={
                                    analytics?.topSpender
                                        ? `${analytics.topSpender.name} · ${formatCurrency(analytics.topSpender.total)}`
                                        : "-"
                                }
                                icon={Crown}
                                tone="bg-amber-500/10 text-amber-500"
                            />
                            <AnalyticsMetric
                                label="Shipment Cost"
                                value={formatCurrency(analytics?.totalShipmentFees || 0)}
                                icon={Truck}
                                tone="bg-red-500/10 text-red-500"
                            />
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr_1.1fr]">
                            <div className="rounded-2xl border border-border bg-background p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <PieChartIcon className="h-4 w-4 text-accent" />
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Orders by Province / Domicile
                                    </h3>
                                </div>
                                {domicileChartData.length > 0 ? (
                                    <div className="grid h-52 grid-cols-[minmax(108px,0.9fr)_minmax(0,1.1fr)] items-center gap-3">
                                        <div className="h-40 min-w-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={domicileChartData}
                                                        dataKey="value"
                                                        nameKey="label"
                                                        innerRadius={34}
                                                        outerRadius={58}
                                                        paddingAngle={3}
                                                    >
                                                        {domicileChartData.map(
                                                            (entry, index) => (
                                                                <Cell
                                                                    key={entry.label}
                                                                    fill={
                                                                        DOMICILE_COLORS[
                                                                        index %
                                                                        DOMICILE_COLORS.length
                                                                        ]
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(
                                                            value: number,
                                                            name: string,
                                                        ) => [
                                                                `${formatNumber(value)} order(s)`,
                                                                name,
                                                            ]}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="min-w-0 space-y-2">
                                            {domicileChartData.map((domicile, index) => (
                                                <div
                                                    key={domicile.label}
                                                    className="flex min-w-0 items-center gap-2 text-[11px]"
                                                >
                                                    <span
                                                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                                        style={{
                                                            backgroundColor:
                                                                DOMICILE_COLORS[
                                                                index %
                                                                DOMICILE_COLORS.length
                                                                ],
                                                        }}
                                                    />
                                                    <span
                                                        className="min-w-0 flex-1 truncate text-muted-foreground"
                                                        title={domicile.label}
                                                    >
                                                        {domicile.label}
                                                    </span>
                                                    <span className="shrink-0 font-semibold text-foreground">
                                                        {formatNumber(domicile.value)}
                                                    </span>
                                                    <span className="w-8 shrink-0 text-right text-muted-foreground">
                                                        {domicileOrderTotal > 0
                                                            ? `${Math.round(
                                                                (domicile.value /
                                                                    domicileOrderTotal) *
                                                                100,
                                                            )}%`
                                                            : "0%"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                                        No domicile data yet
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-border bg-background p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Best Sellers
                                    </h3>
                                    <span className="text-xs text-muted-foreground">
                                        by units
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {(analytics?.bestSellers || []).slice(0, 4).map((product) => (
                                        <div
                                            key={product.productId}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {product.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {product.label || "-"}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-foreground">
                                                    {formatNumber(product.units)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatCurrency(product.revenue)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {(analytics?.bestSellers || []).length === 0 && (
                                        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                                            No product sales yet
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-background p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Customer Highlights
                                    </h3>
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                        <Users className="h-3.5 w-3.5" />
                                        {formatNumber(analytics?.uniqueCustomers || 0)} unique
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {(analytics?.topSpenders || []).slice(0, 4).map((spender) => (
                                        <div
                                            key={spender.name}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {spender.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {spender.orders} order(s)
                                                </p>
                                            </div>
                                            <p className="text-sm font-bold text-foreground">
                                                {formatCurrency(spender.total)}
                                            </p>
                                        </div>
                                    ))}
                                    {(analytics?.topSpenders || []).length === 0 && (
                                        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                                            No spender data yet
                                        </p>
                                    )}
                                    <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                        Average order:{" "}
                                        <span className="font-semibold text-foreground">
                                            {formatCurrency(analytics?.averageOrderValue || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>

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
                                <th className="text-left px-5 py-3 font-medium">
                                    <SortableHeader
                                        label="Customer"
                                        field="shipping_name"
                                        sortBy={sortBy}
                                        sortDir={sortDir}
                                        onSort={handleSort}
                                    />
                                </th>
                                <th className="text-left px-5 py-3 font-medium">Items</th>
                                <th className="text-left px-5 py-3 font-medium">
                                    <SortableHeader
                                        label="Total"
                                        field="total_price"
                                        sortBy={sortBy}
                                        sortDir={sortDir}
                                        onSort={handleSort}
                                    />
                                </th>
                                <th className="text-left px-5 py-3 font-medium">
                                    <SortableHeader
                                        label="Shipment"
                                        field="shipping_fee"
                                        sortBy={sortBy}
                                        sortDir={sortDir}
                                        onSort={handleSort}
                                    />
                                </th>
                                <th className="text-left px-5 py-3 font-medium">
                                    <SortableHeader
                                        label="Status"
                                        field="status"
                                        sortBy={sortBy}
                                        sortDir={sortDir}
                                        onSort={handleSort}
                                    />
                                </th>
                                <th className="text-left px-5 py-3 font-medium">
                                    <SortableHeader
                                        label="Date"
                                        field="created_at"
                                        sortBy={sortBy}
                                        sortDir={sortDir}
                                        onSort={handleSort}
                                    />
                                </th>
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
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
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
                                        <td className="px-5 py-3 text-xs text-muted-foreground">
                                            {order.order_source === "manual_whatsapp" &&
                                                Number(order.shipping_fee || 0) > 0 ? (
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {formatCurrency(order.shipping_fee)}
                                                    </p>
                                                    <p>{order.shipment_type || "Shipment"}</p>
                                                </div>
                                            ) : (
                                                "-"
                                            )}
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
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(
                                                            `/panel-xyz123/orders/new?duplicate=${order.id}`,
                                                        );
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Duplicate"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
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
