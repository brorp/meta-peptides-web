"use client";

import { useEffect, useState } from "react";
import {
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingJourneyId, setUpdatingJourneyId] = useState<string | null>(null);

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

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(buildBlankForm());
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(buildBlankForm());
    setIsModalOpen(true);
  };

  const updateForm = (key: keyof CustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        await axios.put(`/admin/customers/${editingId}`, form);
        toast.success("Customer updated");
      } else {
        await axios.post("/admin/customers", {
          ...form,
          lead_source: "manual",
          current_journey: "new_leads",
        });
        toast.success("Manual customer created");
      }

      closeModal();
      fetchCustomers();
    } catch (error: any) {
      toast.error(
        editingId ? "Failed to update customer" : "Failed to create customer",
        {
          description: getErrorMessage(error, "Please review the customer data."),
        },
      );
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
    setIsModalOpen(true);
  };

  const handleJourneyChange = async (customer: Customer, nextJourney: string) => {
    if (customer.current_journey === nextJourney) return;

    setUpdatingJourneyId(customer.id);
    const previousJourney = customer.current_journey;

    setCustomers((prev) =>
      prev.map((item) =>
        item.id === customer.id ? { ...item, current_journey: nextJourney } : item,
      ),
    );

    try {
      await axios.put(`/admin/customers/${customer.id}`, {
        current_journey: nextJourney,
      });
      toast.success("Customer journey updated", {
        description: `${customer.full_name} is now ${journeyLabel(nextJourney)}.`,
      });
      fetchCustomers();
    } catch (error: any) {
      setCustomers((prev) =>
        prev.map((item) =>
          item.id === customer.id
            ? { ...item, current_journey: previousJourney }
            : item,
        ),
      );
      toast.error("Failed to update journey", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      setUpdatingJourneyId(null);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete customer "${customer.full_name}"?`)) return;

    try {
      await axios.delete(`/admin/customers/${customer.id}`);
      toast.success("Customer deleted");
      if (editingId === customer.id) closeModal();
      fetchCustomers();
    } catch (error: any) {
      toast.error("Failed to delete customer", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Contact book synced from orders plus manual leads from chat.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:bg-accent/90"
        >
          <UserPlus className="h-4 w-4" />
          Create Manual Customer
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customers..."
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={journey}
          onChange={(event) => {
            setJourney(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        >
          <option value="">All journeys</option>
          {JOURNEY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-5 py-3 text-left font-medium">Customer</th>
                <th className="px-5 py-3 text-left font-medium">Contact</th>
                <th className="px-5 py-3 text-left font-medium">Journey</th>
                <th className="px-5 py-3 text-left font-medium">Source</th>
                <th className="px-5 py-3 text-left font-medium">Last Order</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">
                        {customer.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.domicile || "-"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <p>{customer.whatsapp_phone || "-"}</p>
                      <p className="text-xs">
                        {customer.username
                          ? `@${customer.username}`
                          : customer.email || ""}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="relative">
                        <select
                          aria-label={`Update ${customer.full_name} journey`}
                          value={customer.current_journey}
                          disabled={updatingJourneyId === customer.id}
                          onChange={(event) =>
                            handleJourneyChange(customer, event.target.value)
                          }
                          className="min-w-44 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent outline-none transition-all hover:border-accent/40 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                        >
                          {JOURNEY_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        {updatingJourneyId === customer.id && (
                          <Loader2 className="absolute right-7 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-accent" />
                        )}
                      </div>
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
                          aria-label={`Edit ${customer.full_name}`}
                          onClick={() => handleEdit(customer)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${customer.full_name}`}
                          onClick={() => handleDelete(customer)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
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
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted disabled:opacity-30"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {role === "root" && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Recent Daily Task Logs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-5 py-3 text-left font-medium">Customer</th>
                  <th className="px-5 py-3 text-left font-medium">Task</th>
                  <th className="px-5 py-3 text-left font-medium">Journey</th>
                  <th className="px-5 py-3 text-left font-medium">Evidence</th>
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
                      {journeyLabel(log.from_journey)} to{" "}
                      {journeyLabel(log.to_journey)}
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
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-muted-foreground"
                    >
                      No daily task logs yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {editingId ? "Edit Customer" : "Create Manual Customer"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {editingId
                    ? "Update contact information and customer journey."
                    : "Manual customers start from New Leads by default."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Name
                  </span>
                  <input
                    value={form.full_name}
                    onChange={(event) => updateForm("full_name", event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Username / Shopee Handle
                  </span>
                  <input
                    value={form.username}
                    onChange={(event) => updateForm("username", event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    placeholder="@username"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    WhatsApp Number
                  </span>
                  <input
                    value={form.whatsapp_phone}
                    onChange={(event) =>
                      updateForm("whatsapp_phone", event.target.value)
                    }
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    placeholder="0812..."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Email
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Domicile
                  </span>
                  <input
                    value={form.domicile}
                    onChange={(event) => updateForm("domicile", event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </label>

                {editingId && (
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Journey
                    </span>
                    <select
                      value={form.current_journey}
                      onChange={(event) =>
                        updateForm("current_journey", event.target.value)
                      }
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    >
                      {JOURNEY_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Notes
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:bg-accent/90 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingId ? "Save Changes" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
