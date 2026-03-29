"use client";

import { useEffect, useState } from "react";
import {
  BadgePercent,
  Edit,
  Loader2,
  Plus,
  Search,
  TicketX,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

type VoucherRecord = {
  id: string;
  code: string;
  discount_nominal: number;
  max_discount_cap: number;
  valid_from: string;
  valid_until: string;
  max_claim_qty: number;
  total_claimed: number;
  is_active: boolean;
};

type VoucherFormState = {
  code: string;
  discount_nominal: string;
  max_discount_cap: string;
  valid_from: string;
  valid_until: string;
  max_claim_qty: string;
  is_active: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const buildDefaultForm = (): VoucherFormState => {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setDate(nextMonth.getDate() + 30);

  return {
    code: "",
    discount_nominal: "",
    max_discount_cap: "",
    valid_from: toDateTimeLocal(now.toISOString()),
    valid_until: toDateTimeLocal(nextMonth.toISOString()),
    max_claim_qty: "1",
    is_active: true,
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

const getErrorMessage = (error: any, fallback: string) =>
  error?.message || error?.error || fallback;

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VoucherFormState>(buildDefaultForm);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/admin/vouchers", {
        params: { page, limit: 20, keyword },
      });

      if (data.success) {
        setVouchers(data.data || []);
        setTotalPages(data.pagination?.total_pages || 1);
      }
    } catch (error: any) {
      toast.error("Failed to fetch vouchers", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [page, keyword]);

  const resetForm = () => {
    setEditingId(null);
    setForm(buildDefaultForm());
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_nominal: Number(form.discount_nominal),
      max_discount_cap: Number(form.max_discount_cap),
      valid_from: new Date(form.valid_from).toISOString(),
      valid_until: new Date(form.valid_until).toISOString(),
      max_claim_qty: Number(form.max_claim_qty),
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        await axios.put(`/admin/vouchers/${editingId}`, payload);
        toast.success("Voucher updated");
      } else {
        await axios.post("/admin/vouchers", payload);
        toast.success("Voucher created");
      }

      resetForm();
      fetchVouchers();
    } catch (error: any) {
      toast.error(editingId ? "Failed to update voucher" : "Failed to create voucher", {
        description: getErrorMessage(error, "Please review the voucher data."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (voucher: VoucherRecord) => {
    setEditingId(voucher.id);
    setForm({
      code: voucher.code || "",
      discount_nominal: String(voucher.discount_nominal || 0),
      max_discount_cap: String(voucher.max_discount_cap || 0),
      valid_from: toDateTimeLocal(voucher.valid_from),
      valid_until: toDateTimeLocal(voucher.valid_until),
      max_claim_qty: String(voucher.max_claim_qty || 1),
      is_active: voucher.is_active !== false,
    });
  };

  const handleDelete = async (voucher: VoucherRecord) => {
    if (!confirm(`Delete voucher ${voucher.code}?`)) return;

    try {
      await axios.delete(`/admin/vouchers/${voucher.id}`);
      toast.success("Voucher deleted");

      if (editingId === voucher.id) {
        resetForm();
      }

      fetchVouchers();
    } catch (error: any) {
      toast.error("Failed to delete voucher", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vouchers</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage checkout discount codes.
          </p>
        </div>
        <button
          onClick={resetForm}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          {editingId ? "New Voucher" : "Reset Form"}
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-2xl p-5 space-y-5"
      >
        <div className="flex items-center gap-2">
          <BadgePercent className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">
            {editingId ? "Edit Voucher" : "Create Voucher"}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Voucher Code
            </span>
            <input
              value={form.code}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
              }
              placeholder="WELCOME10"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Discount Nominal
            </span>
            <input
              type="number"
              min="1"
              value={form.discount_nominal}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, discount_nominal: e.target.value }))
              }
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Max Discount Cap
            </span>
            <input
              type="number"
              min="1"
              value={form.max_discount_cap}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, max_discount_cap: e.target.value }))
              }
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Valid From
            </span>
            <input
              type="datetime-local"
              value={form.valid_from}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, valid_from: e.target.value }))
              }
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Valid Until
            </span>
            <input
              type="datetime-local"
              value={form.valid_until}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, valid_until: e.target.value }))
              }
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Max Claim Quantity
            </span>
            <input
              type="number"
              min="1"
              value={form.max_claim_qty}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, max_claim_qty: e.target.value }))
              }
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
            />
          </label>
        </div>

        <label className="inline-flex items-center gap-3 rounded-xl border border-border px-4 py-3 bg-background">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, is_active: e.target.checked }))
            }
            className="h-4 w-4 accent-green-600"
          />
          <span className="text-sm text-foreground">Voucher is active</span>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {editingId ? "Save Changes" : "Create Voucher"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search vouchers..."
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
                <th className="text-left px-5 py-3 font-medium">Code</th>
                <th className="text-left px-5 py-3 font-medium">Discount</th>
                <th className="text-left px-5 py-3 font-medium">Usage</th>
                <th className="text-left px-5 py-3 font-medium">Validity</th>
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
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <TicketX className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No vouchers found
                  </td>
                </tr>
              ) : (
                vouchers.map((voucher) => (
                  <tr
                    key={voucher.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-semibold text-foreground">{voucher.code}</p>
                        <p className="text-xs text-muted-foreground">
                          Cap {formatCurrency(voucher.max_discount_cap)}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-foreground font-medium">
                      {formatCurrency(voucher.discount_nominal)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {voucher.total_claimed || 0} / {voucher.max_claim_qty}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <div className="space-y-1">
                        <p>{formatDate(voucher.valid_from)}</p>
                        <p className="text-xs">until {formatDate(voucher.valid_until)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          voucher.is_active !== false
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}
                      >
                        {voucher.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(voucher)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(voucher)}
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
