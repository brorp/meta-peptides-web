"use client";

import { useEffect, useState } from "react";
import { Edit, Loader2, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

const JOURNEY_OPTIONS = [
  ["new_leads", "New Leads"],
  ["intro", "Intro"],
  ["pre_consultation", "Pre-consultation"],
  ["why_meta", "WhyMeta"],
  ["trial_closing", "Trial Closing"],
  ["fu_h1", "FU H+1"],
  ["fu_h3", "FU H+3"],
  ["closing", "Closing"],
  ["guidelines", "Guidelines"],
  ["shipment_complete", "Shipment Complete"],
  ["cs_h7", "CS H+7"],
  ["cs_h14", "CS H+14"],
  ["reorder_reminder", "Reorder Reminder"],
] as const;

type Customer = {
  id: string;
  full_name: string;
  username: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  domicile: string | null;
  lead_source: string;
  current_journey: string;
  notes: string | null;
  updated_at: string;
  last_order?: {
    id: string;
    total_price: number;
    order_source: string;
    manual_reference: string | null;
  } | null;
};

type CustomerForm = {
  full_name: string;
  username: string;
  whatsapp_phone: string;
  email: string;
  domicile: string;
  current_journey: string;
  notes: string;
};

const buildBlankForm = (): CustomerForm => ({
  full_name: "",
  username: "",
  whatsapp_phone: "",
  email: "",
  domicile: "",
  current_journey: "new_leads",
  notes: "",
});

const journeyLabel = (value?: string) =>
  JOURNEY_OPTIONS.find(([key]) => key === value)?.[1] || "New Leads";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [role, setRole] = useState<"root" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [journey, setJourney] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(buildBlankForm);

  const fetchAdminRole = async () => {
    try {
      const { data } = await axios.get("/admin/auth/me");
      setRole(data.data?.role || null);
      if (data.data?.role === "root") {
        const logResponse = await axios.get("/admin/daily-tasks/logs", {
          params: { page: 1, limit: 10 },
        });
        setLogs(logResponse.data?.data || []);
      }
    } catch {
      setRole(null);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/admin/customers", {
        params: { page, limit: 20, keyword, journey },
      });

      if (data.success) {
        setCustomers(data.data || []);
        setTotalPages(data.pagination?.total_pages || 1);
      }
    } catch (error: any) {
      toast.error("Failed to fetch customers", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminRole();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [page, keyword, journey]);

  const resetForm = () => {
    setEditingId(null);
    setForm(buildBlankForm());
  };

  const updateForm = (key: keyof CustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload =
        role === "admin"
          ? {
              full_name: form.full_name,
              username: form.username,
              whatsapp_phone: form.whatsapp_phone,
              email: form.email,
              domicile: form.domicile,
              notes: form.notes,
            }
          : form;

      if (editingId) {
        await axios.put(`/admin/customers/${editingId}`, payload);
        toast.success("Customer updated");
      } else {
        await axios.post("/admin/customers", {
          ...form,
          lead_source: "manual",
          current_journey: "new_leads",
        });
        toast.success("Customer created");
      }

      resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast.error(editingId ? "Failed to update customer" : "Failed to create customer", {
        description: getErrorMessage(error, "Please review the customer data."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({
      full_name: customer.full_name || "",
      username: customer.username || "",
      whatsapp_phone: customer.whatsapp_phone || "",
      email: customer.email || "",
      domicile: customer.domicile || "",
      current_journey: customer.current_journey || "new_leads",
      notes: customer.notes || "",
    });
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete customer "${customer.full_name}"?`)) return;

    try {
      await axios.delete(`/admin/customers/${customer.id}`);
      toast.success("Customer deleted");
      if (editingId === customer.id) resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast.error("Failed to delete customer", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Contact book synced from orders plus manual leads from chat.
          </p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          {editingId ? "New Customer" : "Reset Form"}
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-2xl p-5 space-y-5"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">
            {editingId ? "Edit Customer" : "Manual Lead Input"}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Name</span>
            <input
              value={form.full_name}
              onChange={(e) => updateForm("full_name", e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Username / Shopee Handle
            </span>
            <input
              value={form.username}
              onChange={(e) => updateForm("username", e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="@username"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              WhatsApp Number
            </span>
            <input
              value={form.whatsapp_phone}
              onChange={(e) => updateForm("whatsapp_phone", e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="0812..."
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Domicile
            </span>
            <input
              value={form.domicile}
              onChange={(e) => updateForm("domicile", e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </label>

          {editingId && role === "root" && (
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">
                Journey
              </span>
              <select
                value={form.current_journey}
                onChange={(e) => updateForm("current_journey", e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              >
                {JOURNEY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="space-y-2 md:col-span-2 xl:col-span-3">
            <span className="text-xs font-medium text-muted-foreground">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              rows={3}
              className="w-full resize-none bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {editingId ? "Save Changes" : "Create Customer"}
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

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customers..."
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
          />
        </div>
        <select
          value={journey}
          onChange={(e) => {
            setJourney(e.target.value);
            setPage(1);
          }}
          className="bg-card border border-border rounded-xl py-2.5 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          <option value="">All journeys</option>
          {JOURNEY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Customer</th>
                <th className="text-left px-5 py-3 font-medium">Contact</th>
                <th className="text-left px-5 py-3 font-medium">Journey</th>
                <th className="text-left px-5 py-3 font-medium">Source</th>
                <th className="text-left px-5 py-3 font-medium">Last Order</th>
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
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{customer.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.domicile || "-"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <p>{customer.whatsapp_phone || "-"}</p>
                      <p className="text-xs">
                        {customer.username ? `@${customer.username}` : customer.email || ""}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        {journeyLabel(customer.current_journey)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {customer.lead_source}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {customer.last_order ? (
                        <div>
                          <p>{formatCurrency(customer.last_order.total_price)}</p>
                          <p className="text-xs">
                            {customer.last_order.manual_reference ||
                              customer.last_order.id.slice(0, 8)}
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(customer)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(customer)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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

      {role === "root" && (
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Recent Daily Task Logs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">Customer</th>
                  <th className="text-left px-5 py-3 font-medium">Task</th>
                  <th className="text-left px-5 py-3 font-medium">Journey</th>
                  <th className="text-left px-5 py-3 font-medium">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50">
                    <td className="px-5 py-3 text-foreground">
                      {log.customer?.full_name || "Customer"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {log.task_type || "-"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {journeyLabel(log.from_journey)} to {journeyLabel(log.to_journey)}
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={log.evidence_url}
                        target="_blank"
                        className="text-accent hover:underline"
                      >
                        View screenshot
                      </a>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                      No daily task logs yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
