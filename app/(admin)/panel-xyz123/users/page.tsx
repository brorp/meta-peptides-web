"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Eye, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";
import { useApiQuery } from "@/hooks/api/useApiQuery";

type User = {
    id: string;
    email: string | null;
    full_name?: string | null;
    phone?: string | null;
    [key: string]: any;
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function AdminUsersPage() {
    const router = useRouter();
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [deleting, setDeleting] = useState<string | null>(null);
    const { data: authResponse } = useApiQuery<any>(
        ["admin-auth-me"],
        "/admin/auth/me",
        undefined,
        { staleTime: 5 * 60 * 1000 },
    );
    const role = authResponse?.data?.role || null;
    const {
        data: usersResponse,
        isLoading: loading,
        refetch: refetchUsers,
    } = useApiQuery<any>(
        ["admin-users", page, keyword],
        "/admin/users",
        { params: { page, limit: 20, keyword } },
    );
    const users: User[] = usersResponse?.data || [];
    const totalPages = usersResponse?.pagination?.total_pages || 1;

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        setDeleting(id);
        try {
            await axios.delete(`/admin/users/${id}`);
            toast.success("User deleted");
            refetchUsers();
        } catch {
            toast.error("Failed to delete user");
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Users</h1>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by email..."
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
                                <th className="text-left px-5 py-3 font-medium">User</th>
                                <th className="text-left px-5 py-3 font-medium">Email</th>
                                <th className="text-right px-5 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-5 py-12 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-5 py-12 text-center text-muted-foreground"
                                    >
                                        <UserX className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                                                    {(user.full_name || user.email || "U")[0].toUpperCase()}
                                                </div>
                                                <span className="text-foreground font-medium">
                                                    {user.full_name || user.email || "-"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {user.email || "-"}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() =>
                                                        router.push(`/panel-xyz123/users/${user.id}`)
                                                    }
                                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {role === "root" && (
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        disabled={deleting === user.id}
                                                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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
