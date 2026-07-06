"use client";

import { useState } from "react";
import {
    Search,
    Loader2,
    Trash2,
    CheckCircle,
    Clock,
    ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";
import { PreorderInterface } from "@/interface/preorders";
import { useApiQuery } from "@/hooks/api/useApiQuery";

export default function AdminPreordersPage() {
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const {
        data: preordersResponse,
        isLoading: loading,
        refetch: refetchPreorders,
    } = useApiQuery<any>(
        ["admin-preorders", page, keyword],
        "/admin/preorders",
        { params: { page, limit: 20, keyword } },
    );
    const preorders: PreorderInterface[] = preordersResponse?.data || [];
    const totalPages = preordersResponse?.pagination?.total_pages || 1;

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this preorder?")) return;
        try {
            await axios.delete(`/admin/preorders/${id}`);
            toast.success("Preorder deleted");
            refetchPreorders();
        } catch {
            toast.error("Failed to delete preorder");
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            await axios.put(`/admin/preorders/${id}`, { status: newStatus });
            toast.success("Preorder status updated");
            refetchPreorders();
        } catch {
            toast.error("Failed to update status");
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle className="w-3 h-3 mr-1" />;
            case "contacted":
                return <Clock className="w-3 h-3 mr-1" />;
            default:
                return <Clock className="w-3 h-3 mr-1" />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-500/10 text-green-500 border-green-500/20";
            case "contacted":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            default:
                return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Shopee Preorders</h1>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search name, whatsapp, or shopee username..."
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
                                <th className="text-left px-5 py-3 font-medium">Customer Details</th>
                                <th className="text-left px-5 py-3 font-medium">Platform Info</th>
                                <th className="text-left px-5 py-3 font-medium">Product Ordered</th>
                                <th className="text-left px-5 py-3 font-medium">Status / Update</th>
                                <th className="text-right px-5 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : preorders.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-12 text-center text-muted-foreground"
                                    >
                                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        No preorders found
                                    </td>
                                </tr>
                            ) : (
                                preorders.map((preorder: any) => (
                                    <tr
                                        key={preorder.id}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="px-5 py-3">
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {preorder.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {preorder.whatsapp_number}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="text-muted-foreground">
                                                <p className="font-medium text-foreground">
                                                    @{preorder.shopee_username}
                                                </p>
                                                <p className="text-xs">{preorder.domisili}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-foreground">
                                            {preorder.products?.name || preorder.product_name || "Unknown Product"}
                                        </td>
                                        <td className="px-5 py-3">
                                            <select
                                                value={preorder.status}
                                                onChange={(e) => updateStatus(preorder.id, e.target.value)}
                                                className={`text-xs px-2 py-1 rounded-md border outline-none ${getStatusStyle(preorder.status)}`}
                                            >
                                                <option value="pending" className="text-foreground bg-popover">Pending</option>
                                                <option value="contacted" className="text-foreground bg-popover">Contacted</option>
                                                <option value="completed" className="text-foreground bg-popover">Completed</option>
                                            </select>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleDelete(preorder.id)}
                                                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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
