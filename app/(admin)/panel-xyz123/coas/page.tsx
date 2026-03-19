"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Plus, Edit, Trash2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

export default function AdminCoasPage() {
    const router = useRouter();
    const [coas, setCoas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchCoas = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/admin/lab-tests", {
                params: { page, limit: 20, keyword },
            });
            if (data.success) {
                setCoas(data.data || []);
                setTotalPages(data.pagination?.total_pages || 1);
            }
        } catch {
            toast.error("Failed to fetch COAs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoas();
    }, [page, keyword]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this COA?")) return;
        try {
            await axios.delete(`/admin/lab-tests/${id}`);
            toast.success("COA deleted");
            fetchCoas();
        } catch {
            toast.error("Failed to delete COA");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">COA & Lab Tests</h1>
                <button
                    onClick={() => router.push("/panel-xyz123/coas/new")}
                    className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    New COA
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by product name..."
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
                                <th className="text-left px-5 py-3 font-medium">Image Preview</th>
                                <th className="text-left px-5 py-3 font-medium">Product</th>
                                <th className="text-left px-5 py-3 font-medium">Purity Level</th>
                                <th className="text-left px-5 py-3 font-medium">Test Date</th>
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
                            ) : coas.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-12 text-center text-muted-foreground"
                                    >
                                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        No COAs found
                                    </td>
                                </tr>
                            ) : (
                                coas.map((coa) => (
                                    <tr
                                        key={coa.id}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="px-5 py-3">
                                            {coa.report_images && coa.report_images.length > 0 ? (
                                                <a href={coa.report_images[0]} target="_blank" rel="noopener noreferrer">
                                                    <img
                                                        src={coa.report_images[0]}
                                                        alt="COA"
                                                        className="w-12 h-16 rounded object-cover border border-border hover:opacity-80 transition-opacity"
                                                    />
                                                </a>
                                            ) : (
                                                <div className="w-12 h-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground border border-border">
                                                    None
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-foreground">
                                                {coa.product?.name || "Unknown Product"}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground font-medium">
                                            {coa.purity_level || "-"}
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {new Date(coa.test_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {coa.report_url && (
                                                    <a
                                                        href={coa.report_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                        title="View PDF / External Report"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => router.push(`/panel-xyz123/coas/${coa.id}`)}
                                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(coa.id)}
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
