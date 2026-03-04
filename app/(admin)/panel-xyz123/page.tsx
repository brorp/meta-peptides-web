"use client";

import { useEffect, useState } from "react";
import { DollarSign, Package, ShoppingCart, Users, Clock } from "lucide-react";
import { api as axios } from "@/lib/axios";

type Stats = {
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    recentOrders: any[];
};

function StatsCard({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string;
    value: string | number;
    icon: any;
    color: string;
}) {
    return (
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}
            >
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
            </div>
        </div>
    );
}

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
        shipped: "bg-purple-500/10 text-purple-500 border-purple-500/20",
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

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await axios.get("/admin/stats");
                if (data.success) setStats(data.data);
            } catch (err) {
                console.error("Failed to fetch stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="h-24 bg-card border border-border rounded-2xl animate-pulse"
                        />
                    ))}
                </div>
                <div className="h-64 bg-card border border-border rounded-2xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    label="Total Revenue"
                    value={formatCurrency(stats?.totalRevenue || 0)}
                    icon={DollarSign}
                    color="bg-green-500/10 text-green-500"
                />
                <StatsCard
                    label="Total Orders"
                    value={stats?.totalOrders || 0}
                    icon={ShoppingCart}
                    color="bg-blue-500/10 text-blue-500"
                />
                <StatsCard
                    label="Total Products"
                    value={stats?.totalProducts || 0}
                    icon={Package}
                    color="bg-purple-500/10 text-purple-500"
                />
                <StatsCard
                    label="Total Users"
                    value={stats?.totalUsers || 0}
                    icon={Users}
                    color="bg-orange-500/10 text-orange-500"
                />
            </div>

            {/* Pending Orders Alert */}
            {(stats?.pendingOrders || 0) > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-yellow-500 shrink-0" />
                    <p className="text-sm text-yellow-500 font-medium">
                        {stats?.pendingOrders} order(s) pending review
                    </p>
                </div>
            )}

            {/* Recent Orders */}
            <div className="bg-card border border-border rounded-2xl">
                <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">
                        Recent Orders
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-muted-foreground">
                                <th className="text-left px-5 py-3 font-medium">Order ID</th>
                                <th className="text-left px-5 py-3 font-medium">Customer</th>
                                <th className="text-left px-5 py-3 font-medium">Total</th>
                                <th className="text-left px-5 py-3 font-medium">Status</th>
                                <th className="text-left px-5 py-3 font-medium">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(stats?.recentOrders || []).map((order: any) => (
                                <tr
                                    key={order.id}
                                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() =>
                                        (window.location.href = `/panel-xyz123/orders/${order.id}`)
                                    }
                                >
                                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                                        {order.id.slice(0, 8)}...
                                    </td>
                                    <td className="px-5 py-3 text-foreground">
                                        {order.shipping_name || "Guest"}
                                    </td>
                                    <td className="px-5 py-3 text-foreground font-medium">
                                        {formatCurrency(order.total_price)}
                                    </td>
                                    <td className="px-5 py-3">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="px-5 py-3 text-muted-foreground text-xs">
                                        {formatDate(order.created_at)}
                                    </td>
                                </tr>
                            ))}
                            {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-8 text-center text-muted-foreground"
                                    >
                                        No orders yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
