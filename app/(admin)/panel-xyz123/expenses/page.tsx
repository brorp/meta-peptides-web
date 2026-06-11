"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  Edit,
  Loader2,
  Plus,
  ReceiptText,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

type ExpenseRecord = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  vendor: string | null;
  payment_method: string | null;
  notes: string | null;
};

type ExpenseFormState = {
  title: string;
  category: string;
  amount: string;
  expense_date: string;
  vendor: string;
  payment_method: string;
  notes: string;
};

const todayLocalDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const buildDefaultForm = (): ExpenseFormState => ({
  title: "",
  category: "Operations",
  amount: "",
  expense_date: todayLocalDate(),
  vendor: "",
  payment_method: "",
  notes: "",
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string | null) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
        dateStyle: "medium",
      })
    : "-";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || error?.error || fallback;

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(buildDefaultForm);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/admin/expenses", {
        params: { page, limit: 20, keyword },
      });

      if (data.success) {
        setExpenses(data.data || []);
        setTotalPages(data.pagination?.total_pages || 1);
      }
    } catch (error: any) {
      toast.error("Failed to fetch expenses", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [page, keyword]);

  const resetForm = () => {
    setEditingId(null);
    setDuplicatingId(null);
    setForm(buildDefaultForm());
  };

  const updateForm = (key: keyof ExpenseFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      amount: Number(form.amount || 0),
    };

    try {
      if (editingId) {
        await axios.put(`/admin/expenses/${editingId}`, payload);
        toast.success("Expense updated");
      } else {
        await axios.post("/admin/expenses", payload);
        toast.success("Expense created");
      }

      resetForm();
      fetchExpenses();
    } catch (error: any) {
      toast.error(editingId ? "Failed to update expense" : "Failed to create expense", {
        description: getErrorMessage(error, "Please review the expense data."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense: ExpenseRecord) => {
    setEditingId(expense.id);
    setDuplicatingId(null);
    setForm({
      title: expense.title || "",
      category: expense.category || "Operations",
      amount: String(expense.amount || 0),
      expense_date: expense.expense_date || todayLocalDate(),
      vendor: expense.vendor || "",
      payment_method: expense.payment_method || "",
      notes: expense.notes || "",
    });
  };

  const handleDuplicate = (expense: ExpenseRecord) => {
    setEditingId(null);
    setDuplicatingId(expense.id);
    setForm({
      title: expense.title || "",
      category: expense.category || "Operations",
      amount: String(expense.amount || 0),
      expense_date: expense.expense_date || todayLocalDate(),
      vendor: expense.vendor || "",
      payment_method: expense.payment_method || "",
      notes: expense.notes || "",
    });
  };

  const handleDelete = async (expense: ExpenseRecord) => {
    if (!confirm(`Delete expense "${expense.title}"?`)) return;

    try {
      await axios.delete(`/admin/expenses/${expense.id}`);
      toast.success("Expense deleted");

      if (editingId === expense.id) resetForm();
      fetchExpenses();
    } catch (error: any) {
      toast.error("Failed to delete expense", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Record operational costs that should be subtracted from net profit.
          </p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          {editingId ? "New Expense" : "Reset Form"}
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-2xl p-5 space-y-5"
      >
        <div className="flex items-center gap-2">
          <ReceiptText className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">
            {editingId
              ? "Edit Expense"
              : duplicatingId
                ? "Duplicate Expense"
                : "Create Expense"}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Expense Title
            </span>
            <input
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              placeholder="Packaging supplies"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Category
            </span>
            <input
              value={form.category}
              onChange={(e) => updateForm("category", e.target.value)}
              placeholder="Operations"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Amount
            </span>
            <input
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => updateForm("amount", e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Expense Date
            </span>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => updateForm("expense_date", e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Vendor
            </span>
            <input
              value={form.vendor}
              onChange={(e) => updateForm("vendor", e.target.value)}
              placeholder="Optional"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Payment Method
            </span>
            <input
              value={form.payment_method}
              onChange={(e) => updateForm("payment_method", e.target.value)}
              placeholder="Bank transfer, cash, card"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </label>

          <label className="space-y-2 md:col-span-2 xl:col-span-3">
            <span className="text-xs font-medium text-muted-foreground">
              Notes
            </span>
            <textarea
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              rows={3}
              className="w-full resize-none bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="Optional internal note"
            />
          </label>
        </div>

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
            {editingId
              ? "Save Changes"
              : duplicatingId
                ? "Create Copy"
                : "Create Expense"}
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
          placeholder="Search expenses..."
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
                <th className="text-left px-5 py-3 font-medium">Expense</th>
                <th className="text-left px-5 py-3 font-medium">Category</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium">Vendor</th>
                <th className="text-left px-5 py-3 font-medium">Amount</th>
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
              ) : expenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    <ReceiptText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No expenses found
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{expense.title}</p>
                      {expense.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {expense.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {expense.category}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {formatDate(expense.expense_date)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {expense.vendor || "-"}
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(expense)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(expense)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(expense)}
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
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
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
