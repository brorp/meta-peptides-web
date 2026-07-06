"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";
import { useApiQuery } from "@/hooks/api/useApiQuery";

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value);
}

export default function AdminUserDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        full_name: "",
        phone: "",
        role: "customer",
    });
    const { data: authResponse } = useApiQuery<any>(
        ["admin-auth-me"],
        "/admin/auth/me",
        undefined,
        { staleTime: 5 * 60 * 1000 },
    );
    const adminRole = authResponse?.data?.role || null;
    const {
        data: userResponse,
        isLoading: loading,
        refetch: refetchUser,
    } = useApiQuery<any>(["admin-user", id], `/admin/users/${id}`);
    const user = userResponse?.data || null;

    useEffect(() => {
        if (!user) return;

        setForm({
            full_name: user.full_name || "",
            phone: user.phone || "",
            role: user.role || "customer",
        });
    }, [userResponse]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload =
                adminRole === "root"
                    ? form
                    : {
                          full_name: form.full_name,
                          phone: form.phone,
                      };
            const { data } = await axios.put(`/admin/users/${id}`, payload);
            if (data.success) {
                toast.success("User updated");
                refetchUser();
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error("Failed to update user");
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

    if (!user) {
        return (
            <div className="text-center text-muted-foreground py-12">
                User not found
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="text-2xl font-bold text-foreground">User Detail</h1>
            </div>

            {/* Edit Form */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-foreground mb-4">
                    Profile Info
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={form.full_name}
                            onChange={(e) =>
                                setForm({ ...form, full_name: e.target.value })
                            }
                            className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                            Phone
                        </label>
                        <input
                            type="text"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                        />
                    </div>
                    {adminRole === "root" && (
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Role
                            </label>
                            <select
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            >
                                <option value="customer">Customer</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                            User ID
                        </label>
                        <input
                            type="text"
                            value={user.id}
                            disabled
                            className="w-full bg-muted border border-border rounded-xl py-2.5 px-3 text-sm text-muted-foreground font-mono"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Order History */}
            {user.orders && user.orders.length > 0 && (
                <div className="bg-card border border-border rounded-2xl">
                    <div className="px-5 py-4 border-b border-border">
                        <h2 className="text-sm font-semibold text-foreground">
                            Order History
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-muted-foreground">
                                    <th className="text-left px-5 py-3 font-medium">Order ID</th>
                                    <th className="text-left px-5 py-3 font-medium">Total</th>
                                    <th className="text-left px-5 py-3 font-medium">Status</th>
                                    <th className="text-left px-5 py-3 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {user.orders.map((order: any) => (
                                    <tr
                                        key={order.id}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                                        onClick={() =>
                                            router.push(`/panel-xyz123/orders/${order.id}`)
                                        }
                                    >
                                        <td className="px-5 py-3 font-mono text-xs">
                                            {order.id.slice(0, 8)}...
                                        </td>
                                        <td className="px-5 py-3 font-medium">
                                            {formatCurrency(order.total_price)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground text-xs">
                                            {formatDate(order.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
