"use client";

import { useEffect, useState } from "react";
import {
    ExternalLink,
    Handshake,
    Loader2,
    MessageCircle,
    Search,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

type ResellerApplication = {
    id: string;
    full_name: string;
    email: string;
    whatsapp_number: string;
    occupation?: string | null;
    business_name: string;
    business_type?: string | null;
    city: string;
    country: string;
    social_link?: string | null;
    estimated_monthly_orders?: number | null;
    notes?: string | null;
    admin_notes?: string | null;
    accepted_terms?: boolean | null;
    status: string;
    created_at: string;
};

const STATUS_TABS = [
    { label: "All", value: "" },
    { label: "New", value: "new" },
    { label: "Contacted", value: "contacted" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
];

const STATUS_STYLES: Record<string, string> = {
    new: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    contacted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    approved: "bg-green-500/10 text-green-500 border-green-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getErrorMessage(error: any, fallback: string) {
    return error?.message || error?.error || fallback;
}

function getWhatsAppUrl(phone: string) {
    const digits = String(phone || "").replace(/[^\d]/g, "");
    const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
    return normalized ? `https://wa.me/${normalized}` : "#";
}

export default function AdminResellersPage() {
    const [applications, setApplications] = useState<ResellerApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/admin/resellers", {
                params: { page, limit: 20, keyword, status },
            });

            if (data.success) {
                setApplications(data.data || []);
                setTotalPages(data.pagination?.total_pages || 1);
            }
        } catch (error: any) {
            toast.error("Failed to fetch reseller applications", {
                description: getErrorMessage(error, "Please try again."),
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [page, keyword, status]);

    const updateStatus = async (id: string, nextStatus: string) => {
        try {
            await axios.put(`/admin/resellers/${id}`, { status: nextStatus });
            toast.success("Reseller status updated");
            fetchApplications();
        } catch (error: any) {
            toast.error("Failed to update reseller", {
                description: getErrorMessage(error, "Please try again."),
            });
        }
    };

    const handleDelete = async (application: ResellerApplication) => {
        if (!confirm(`Delete reseller application from ${application.full_name}?`)) {
            return;
        }

        try {
            await axios.delete(`/admin/resellers/${application.id}`);
            toast.success("Reseller application deleted");
            fetchApplications();
        } catch (error: any) {
            toast.error("Failed to delete reseller application", {
                description: getErrorMessage(error, "Please try again."),
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Reseller Applications
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Review public reseller registrations submitted from the storefront.
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
                    <Handshake className="w-4 h-4" />
                    CMS Intake
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => {
                            setStatus(tab.value);
                            setPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            status === tab.value
                                ? "bg-accent/10 text-accent border-accent/30"
                                : "bg-card text-muted-foreground border-border hover:border-accent/20"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search name, email, WhatsApp, occupation, business..."
                    value={keyword}
                    onChange={(e) => {
                        setKeyword(e.target.value);
                        setPage(1);
                    }}
                    className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                />
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-muted-foreground">
                                <th className="text-left px-5 py-3 font-medium">Applicant</th>
                                <th className="text-left px-5 py-3 font-medium">Business</th>
                                <th className="text-left px-5 py-3 font-medium">Market</th>
                                <th className="text-left px-5 py-3 font-medium">Notes</th>
                                <th className="text-left px-5 py-3 font-medium">Status</th>
                                <th className="text-right px-5 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : applications.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-5 py-12 text-center text-muted-foreground"
                                    >
                                        <Handshake className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        No reseller applications found
                                    </td>
                                </tr>
                            ) : (
                                applications.map((application) => (
                                    <tr
                                        key={application.id}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="px-5 py-3">
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {application.full_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {application.email}
                                                </p>
                                                <a
                                                    href={getWhatsAppUrl(application.whatsapp_number)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                                                >
                                                    <MessageCircle className="w-3 h-3" />
                                                    {application.whatsapp_number}
                                                </a>
                                                {application.occupation && (
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {application.occupation}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-foreground">
                                                {application.business_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {application.business_type || "Type not set"}
                                            </p>
                                            {application.social_link && (
                                                <a
                                                    href={application.social_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    Open link
                                                </a>
                                            )}
                                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                {application.accepted_terms
                                                    ? "Terms accepted"
                                                    : "Terms not recorded"}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            <p className="text-foreground">
                                                {application.city}, {application.country}
                                            </p>
                                            <p className="text-xs">
                                                {application.estimated_monthly_orders ?? 0} est. orders/month
                                            </p>
                                            <p className="text-xs">
                                                {formatDate(application.created_at)}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                                                {application.notes || "-"}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <select
                                                value={application.status}
                                                onChange={(e) =>
                                                    updateStatus(application.id, e.target.value)
                                                }
                                                className={`rounded-md border px-2 py-1 text-xs outline-none ${
                                                    STATUS_STYLES[application.status] ||
                                                    STATUS_STYLES.new
                                                }`}
                                            >
                                                <option value="new" className="bg-popover text-foreground">
                                                    New
                                                </option>
                                                <option
                                                    value="contacted"
                                                    className="bg-popover text-foreground"
                                                >
                                                    Contacted
                                                </option>
                                                <option
                                                    value="approved"
                                                    className="bg-popover text-foreground"
                                                >
                                                    Approved
                                                </option>
                                                <option
                                                    value="rejected"
                                                    className="bg-popover text-foreground"
                                                >
                                                    Rejected
                                                </option>
                                            </select>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end">
                                                <button
                                                    onClick={() => handleDelete(application)}
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
