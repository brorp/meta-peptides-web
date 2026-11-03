"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  SearchableProductSelect,
  type SearchableProductOption,
} from "@/components/admin/searchable-product-select";
import { useApiQuery } from "@/hooks/api/useApiQuery";
import { api as axios } from "@/lib/axios";

const STATUS_OPTIONS = [
  {
    value: "hot",
    label: "Hot",
    dot: "bg-red-500",
    pill: "border-red-500/20 bg-red-500/10 text-red-500",
  },
  {
    value: "warm",
    label: "Warm",
    dot: "bg-amber-500",
    pill: "border-amber-500/20 bg-amber-500/10 text-amber-500",
  },
  {
    value: "cold",
    label: "Cold",
    dot: "bg-sky-500",
    pill: "border-sky-500/20 bg-sky-500/10 text-sky-500",
  },
  {
    value: "skip",
    label: "Skip",
    dot: "bg-muted-foreground",
    pill: "border-border bg-muted text-muted-foreground",
  },
] as const;

const ORIGIN_OPTIONS = [
  ["ads", "Ads"],
  ["tokopedia", "Tokopedia"],
  ["instagram", "Instagram"],
  ["threads", "Threads"],
  ["tiktok", "TikTok"],
  ["fnf", "FnF"],
  ["shopee", "Shopee"],
  ["website", "Website"],
] as const;

const REJECTION_OPTIONS = [
  ["harga", "Harga"],
  ["company", "Company"],
  ["cara_penggunaan", "Cara penggunaan"],
  ["perizinan", "Perizinan"],
  ["produk_tidak_ada", "Produk tidak ada"],
  ["ghosting", "Ghosting"],
] as const;

const VIEW_OPTIONS = [
  ["", "All leads"],
  ["prospect", "Prospects only"],
  ["customer", "Customers only"],
  ["followup_today", "Follow-up due today"],
] as const;

const PAGE_SIZE = 20;

const FIELD_CLASS =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
const FILTER_CLASS =
  "rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

type Option = readonly [string, string];

type Lead = {
  id: string;
  whatsapp_phone: string;
  full_name: string;
  origin: string;
  status: string;
  interest_product_id: string | null;
  interest_text: string | null;
  interest_display: string | null;
  interest_matched: boolean;
  rejection: string | null;
  chat_date: string;
  is_customer: boolean;
  notes: string | null;
  domicile: string | null;
  goal: string | null;
  discord_username: string | null;
  followup: { label: string; date: string; due_today: boolean } | null;
  last_order: {
    id: string;
    invoice_number: string | null;
    manual_reference: string | null;
    total_price: number;
  } | null;
};

type LeadSummary = {
  total: number;
  converted: number;
  by_status: Record<string, number>;
  by_origin: Record<string, number>;
  by_rejection: Record<string, number>;
};

type LeadForm = {
  whatsapp_phone: string;
  full_name: string;
  origin: string;
  status: string;
  interest_product_id: string;
  interest_text: string;
  rejection: string;
  chat_date: string;
  domicile: string;
  goal: string;
  notes: string;
  is_customer: boolean;
};

type ModalState = { mode: "create" } | { mode: "edit"; lead: Lead } | null;

const EDITABLE_KEYS = [
  "whatsapp_phone",
  "full_name",
  "origin",
  "status",
  "rejection",
  "chat_date",
  "domicile",
  "goal",
  "notes",
  "is_customer",
] as const;

const getJakartaToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const formatDate = (date: string, withYear = true) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  });

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));

const percent = (value: number, total: number) =>
  total ? Math.round((value / total) * 100) : 0;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const labelFor = (options: readonly Option[], value?: string | null) =>
  options.find(([key]) => key === value)?.[1] || value || "-";

const statusStyle = (value: string) =>
  STATUS_OPTIONS.find((option) => option.value === value) || STATUS_OPTIONS[3];

const buildBlankForm = (): LeadForm => ({
  whatsapp_phone: "",
  full_name: "",
  origin: "",
  status: "warm",
  interest_product_id: "",
  interest_text: "",
  rejection: "",
  chat_date: getJakartaToday(),
  domicile: "",
  goal: "",
  notes: "",
  is_customer: false,
});

const formFromLead = (lead: Lead): LeadForm => ({
  whatsapp_phone: lead.whatsapp_phone,
  full_name: lead.full_name,
  origin: lead.origin,
  status: lead.status,
  interest_product_id: lead.interest_product_id || "",
  interest_text: lead.interest_product_id ? "" : lead.interest_text || "",
  rejection: lead.rejection || "",
  chat_date: lead.chat_date,
  domicile: lead.domicile || "",
  goal: lead.goal || "",
  notes: lead.notes || "",
  is_customer: lead.is_customer,
});

// Only send what changed, so an edit never rewrites fields nobody touched.
const buildPatch = (form: LeadForm, original: LeadForm) => {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_KEYS) {
    if (form[key] !== original[key]) patch[key] = form[key];
  }
  if (
    form.interest_product_id !== original.interest_product_id ||
    form.interest_text !== original.interest_text
  ) {
    patch.interest_product_id = form.interest_product_id || null;
    patch.interest_text = form.interest_product_id ? null : form.interest_text;
  }
  return patch;
};

const buildCreatePayload = (form: LeadForm) => ({
  whatsapp_phone: form.whatsapp_phone,
  full_name: form.full_name,
  origin: form.origin,
  status: form.status,
  rejection: form.rejection,
  chat_date: form.chat_date,
  interest_product_id: form.interest_product_id || null,
  interest_text: form.interest_product_id ? null : form.interest_text,
});

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function SummaryCard({
  label,
  value,
  detail,
  dotClass,
  active,
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  dotClass?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border bg-card p-4 text-left transition-colors ${active
          ? "border-accent ring-1 ring-accent/40"
          : "border-border hover:border-accent/40"
        }`}
    >
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {dotClass && <span className={`h-2 w-2 rounded-full ${dotClass}`} />}
        {label}
      </span>
      <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">
        {value}
      </span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
    </button>
  );
}

function BreakdownRow({
  label,
  counts,
  options,
  active,
  emptyText,
  onSelect,
}: {
  label: string;
  counts: Record<string, number>;
  options: readonly Option[];
  active: string;
  emptyText: string;
  onSelect: (value: string) => void;
}) {
  const entries = options
    .map(([value, text]) => ({ value, text, count: counts[value] || 0 }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count);

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-20 shrink-0 py-1 font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">
        {entries.length === 0 ? (
          <span className="py-1 text-muted-foreground">{emptyText}</span>
        ) : (
          entries.map((entry) => {
            const isActive = active === entry.value;
            return (
              <button
                key={entry.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelect(isActive ? "" : entry.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${isActive
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-foreground hover:border-accent/40"
                  }`}
              >
                {entry.text}
                <span className="tabular-nums text-muted-foreground">{entry.count}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export default function AdminLeadsPage() {
  const queryClient = useQueryClient();
  const [keywordInput, setKeywordInput] = useState("");
  const keyword = useDebouncedValue(keywordInput.trim(), 300);
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [rejection, setRejection] = useState("");
  const [view, setView] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<LeadForm>(buildBlankForm);
  const [saving, setSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const today = getJakartaToday();

  const { data: authResponse } = useApiQuery<any>(
    ["admin-auth-me"],
    "/admin/auth/me",
    undefined,
    { staleTime: 5 * 60 * 1000 },
  );
  const role = authResponse?.data?.role || null;

  const filters = {
    keyword,
    status,
    origin,
    rejection,
    view,
    date_from: dateFrom,
    date_to: dateTo,
  };
  const leadsQueryKey = ["admin-leads", page, filters];
  const {
    data: leadsResponse,
    isLoading,
    isFetching,
    error: leadsError,
  } = useApiQuery<any>(
    leadsQueryKey,
    "/admin/leads",
    { params: { ...filters, page, limit: PAGE_SIZE } },
    { placeholderData: keepPreviousData },
  );
  const leads: Lead[] = leadsResponse?.data || [];
  const summary: LeadSummary | null = leadsResponse?.summary || null;
  const totalItems: number = leadsResponse?.pagination?.total_items || 0;
  const totalPages = Math.max(1, leadsResponse?.pagination?.total_pages || 1);

  const { data: productsResponse, isLoading: loadingProducts } = useApiQuery<any>(
    ["admin-order-product-options"],
    "/admin/products/options",
    undefined,
    { enabled: modal !== null, staleTime: 5 * 60 * 1000 },
  );
  const products: SearchableProductOption[] = productsResponse?.data || [];

  // After a delete the last page can be empty; step back to the new last page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const hasFilters = Boolean(
    keywordInput || status || origin || rejection || view || dateFrom || dateTo,
  );

  const changeFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  // One date means that day only, so the other end follows it until changed.
  const changeDateFrom = (value: string) => {
    setDateFrom(value);
    if (value && (!dateTo || dateTo < value)) setDateTo(value);
    if (!value) setDateTo("");
    setPage(1);
  };

  const changeDateTo = (value: string) => {
    setDateTo(value);
    if (value && (!dateFrom || dateFrom > value)) setDateFrom(value);
    if (!value) setDateFrom("");
    setPage(1);
  };

  const clearFilters = () => {
    setKeywordInput("");
    setStatus("");
    setOrigin("");
    setRejection("");
    setView("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const refreshLeads = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-leads"] });

  const updateForm = <K extends keyof LeadForm>(key: K, value: LeadForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(buildBlankForm());
    setModal({ mode: "create" });
  };

  const openEdit = (lead: Lead) => {
    setForm(formFromLead(lead));
    setModal({ mode: "edit", lead });
  };

  const closeModal = () => {
    if (!saving) setModal(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);

    try {
      if (modal.mode === "edit") {
        const patch = buildPatch(form, formFromLead(modal.lead));
        if (Object.keys(patch).length) {
          await axios.patch(`/admin/leads/${modal.lead.id}`, patch);
          toast.success("Lead updated");
        }
      } else {
        await axios.post("/admin/leads", buildCreatePayload(form));
        toast.success("Lead added");
      }
      setModal(null);
      refreshLeads();
    } catch (error: any) {
      toast.error(modal.mode === "edit" ? "Failed to update lead" : "Failed to add lead", {
        description: getErrorMessage(error, "Please review the lead data."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (lead: Lead, nextStatus: string) => {
    if (lead.status === nextStatus) return;

    const setRowStatus = (value: string) =>
      queryClient.setQueryData(leadsQueryKey, (current: any) =>
        current
          ? {
            ...current,
            data: (current.data || []).map((item: Lead) =>
              item.id === lead.id ? { ...item, status: value } : item,
            ),
          }
          : current,
      );

    setUpdatingStatusId(lead.id);
    setRowStatus(nextStatus);

    try {
      await axios.patch(`/admin/leads/${lead.id}`, { status: nextStatus });
      toast.success("Lead status updated", {
        description: `${lead.full_name} is now ${statusStyle(nextStatus).label}.`,
      });
      refreshLeads();
    } catch (error: any) {
      setRowStatus(lead.status);
      toast.error("Failed to update status", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDelete = async (lead: Lead) => {
    const warning = lead.is_customer
      ? "\n\nThis lead already bought. The orders and the customer record stay, but they lose the link to this lead."
      : "";
    if (!confirm(`Delete lead "${lead.full_name}"?${warning}`)) return;

    try {
      await axios.delete(`/admin/leads/${lead.id}`);
      toast.success("Lead deleted");
      refreshLeads();
    } catch (error: any) {
      toast.error("Failed to delete lead", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  };

  const isEdit = modal?.mode === "edit";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Leads from Discord{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">!newleads</code>. A
            lead becomes a customer once an order on the same WhatsApp number is paid
            (<code className="rounded bg-muted px-1 py-0.5 text-xs">!invoice</code>, the
            panel, or the website).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:bg-accent/90"
        >
          <UserPlus className="h-4 w-4" />
          Add Lead
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-[94px] animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard
            label="All leads"
            value={summary?.total || 0}
            detail={`${summary?.converted || 0} customers · ${percent(
              summary?.converted || 0,
              summary?.total || 0,
            )}%`}
            active={!status}
            onClick={() => changeFilter(setStatus, "")}
          />
          {STATUS_OPTIONS.map((option) => {
            const count = summary?.by_status[option.value] || 0;
            return (
              <SummaryCard
                key={option.value}
                label={option.label}
                value={count}
                dotClass={option.dot}
                detail={`${percent(count, summary?.total || 0)}% of leads`}
                active={status === option.value}
                onClick={() =>
                  changeFilter(setStatus, status === option.value ? "" : option.value)
                }
              />
            );
          })}
        </div>
      )}

      {summary && summary.total > 0 && (
        <div className="space-y-2 rounded-2xl border border-border bg-card px-4 py-3">
          <BreakdownRow
            label="Origin"
            counts={summary.by_origin}
            options={ORIGIN_OPTIONS}
            active={origin}
            emptyText="-"
            onSelect={(value) => changeFilter(setOrigin, value)}
          />
          <BreakdownRow
            label="Rejection"
            counts={summary.by_rejection}
            options={REJECTION_OPTIONS}
            active={rejection}
            emptyText="No rejections"
            onSelect={(value) => changeFilter(setRejection, value)}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
        <div className="relative w-full xl:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search leads"
            placeholder="Search name, WhatsApp, interest, notes..."
            value={keywordInput}
            onChange={(event) => {
              setKeywordInput(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:flex">
          <select
            aria-label="Filter by origin"
            value={origin}
            onChange={(event) => changeFilter(setOrigin, event.target.value)}
            className={FILTER_CLASS}
          >
            <option value="">All origins</option>
            {ORIGIN_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by rejection"
            value={rejection}
            onChange={(event) => changeFilter(setRejection, event.target.value)}
            className={FILTER_CLASS}
          >
            <option value="">All rejections</option>
            {REJECTION_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by lead type"
            value={view}
            onChange={(event) => changeFilter(setView, event.target.value)}
            className={FILTER_CLASS}
          >
            {VIEW_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs text-muted-foreground">Chat date</span>
          <input
            type="date"
            aria-label="Chat date from"
            value={dateFrom}
            max={dateTo || today}
            onChange={(event) => changeDateFrom(event.target.value)}
            className={`${FILTER_CLASS} min-w-0 flex-1 [color-scheme:dark] xl:flex-none`}
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="date"
            aria-label="Chat date to"
            value={dateTo}
            min={dateFrom || undefined}
            max={today}
            onChange={(event) => changeDateTo(event.target.value)}
            className={`${FILTER_CLASS} min-w-0 flex-1 [color-scheme:dark] xl:flex-none`}
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex w-fit items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3 text-xs text-muted-foreground">
          <span>
            {totalItems} {totalItems === 1 ? "lead" : "leads"}
            {status ? ` · ${statusStyle(status).label}` : ""}
          </span>
          {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="whitespace-nowrap border-b border-border text-muted-foreground">
                <th className="px-5 py-3 text-left font-medium">Lead</th>
                <th className="px-5 py-3 text-left font-medium">Origin</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Interest</th>
                <th className="px-5 py-3 text-left font-medium">Rejection</th>
                <th className="px-5 py-3 text-left font-medium">Chat date</th>
                <th className="px-5 py-3 text-left font-medium">Goal / Notes</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : leadsError ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-destructive">
                    {getErrorMessage(leadsError, "Failed to load leads")}
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    {hasFilters
                      ? "No leads match these filters."
                      : "No leads yet. Add them with !newleads in Discord or the Add Lead button."}
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/50 align-top">
                    <td className="min-w-[180px] px-5 py-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-foreground">{lead.full_name}</span>
                        {lead.is_customer && (
                          <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                            Customer
                          </span>
                        )}
                      </div>
                      <a
                        href={`https://wa.me/${lead.whatsapp_phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted-foreground hover:text-accent hover:underline"
                      >
                        {lead.whatsapp_phone}
                      </a>
                      {lead.domicile && (
                        <p className="text-xs text-muted-foreground">{lead.domicile}</p>
                      )}
                      {lead.last_order && (
                        <Link
                          href={`/panel-xyz123/orders/${lead.last_order.id}`}
                          className="block text-xs text-muted-foreground hover:text-accent hover:underline"
                        >
                          {lead.last_order.invoice_number ||
                            lead.last_order.manual_reference ||
                            lead.last_order.id.slice(0, 8)}{" "}
                          · {formatCurrency(lead.last_order.total_price)}
                        </Link>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex whitespace-nowrap rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                        {labelFor(ORIGIN_OPTIONS, lead.origin)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Status for ${lead.full_name}`}
                          value={lead.status}
                          disabled={updatingStatusId === lead.id}
                          onChange={(event) => handleStatusChange(lead, event.target.value)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-all focus:ring-2 focus:ring-accent/20 disabled:opacity-60 ${statusStyle(lead.status).pill}`}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {updatingStatusId === lead.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="min-w-[140px] px-5 py-3">
                      {lead.interest_display ? (
                        <span
                          className={
                            lead.interest_matched
                              ? "text-foreground"
                              : "italic text-muted-foreground"
                          }
                          title={
                            lead.interest_matched ? undefined : "Not matched to a product"
                          }
                        >
                          {lead.interest_display}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {labelFor(REJECTION_OPTIONS, lead.rejection)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <p className="text-foreground">{formatDate(lead.chat_date)}</p>
                      {!lead.is_customer && (
                        <p
                          className={`text-xs ${lead.followup?.due_today
                              ? "font-medium text-accent"
                              : "text-muted-foreground"
                            }`}
                        >
                          {!lead.followup
                            ? "Past H+7"
                            : lead.followup.due_today
                              ? `${lead.followup.label} due today`
                              : `Next ${lead.followup.label} · ${formatDate(lead.followup.date, false)}`}
                        </p>
                      )}
                      {lead.discord_username && (
                        <p className="text-xs text-muted-foreground">
                          by @{lead.discord_username}
                        </p>
                      )}
                    </td>
                    <td className="min-w-[200px] max-w-[300px] px-5 py-3 text-xs text-muted-foreground">
                      {lead.goal && (
                        <p className="text-foreground/80">Goal: {lead.goal}</p>
                      )}
                      {lead.notes ? (
                        <p className="line-clamp-2 whitespace-pre-line" title={lead.notes}>
                          {lead.notes}
                        </p>
                      ) : (
                        !lead.goal && "-"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${lead.full_name}`}
                          onClick={() => openEdit(lead)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {role === "root" && (
                          <button
                            type="button"
                            aria-label={`Delete ${lead.full_name}`}
                            onClick={() => handleDelete(lead)}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted disabled:opacity-30"
              >
                Previous
              </button>
              <button
                type="button"
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

      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <div>
                <h2 id="lead-modal-title" className="text-lg font-semibold text-foreground">
                  {isEdit ? "Edit Lead" : "Add Lead"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isEdit
                    ? "Changes here also show in Discord (!lead)."
                    : "Same fields as !newleads. Add domicile, goal and notes after the lead is saved."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeModal}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="WhatsApp number" required>
                  <input
                    value={form.whatsapp_phone}
                    onChange={(event) => updateForm("whatsapp_phone", event.target.value)}
                    inputMode="tel"
                    maxLength={20}
                    placeholder="0812..."
                    required
                    className={FIELD_CLASS}
                  />
                </Field>
                <Field label="Name" required>
                  <input
                    value={form.full_name}
                    onChange={(event) => updateForm("full_name", event.target.value)}
                    maxLength={160}
                    required
                    className={FIELD_CLASS}
                  />
                </Field>
                <Field label="Origin" required>
                  <select
                    value={form.origin}
                    onChange={(event) => updateForm("origin", event.target.value)}
                    required
                    className={FIELD_CLASS}
                  >
                    <option value="" disabled>
                      Select origin
                    </option>
                    {ORIGIN_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status" required>
                  <select
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value)}
                    required
                    className={FIELD_CLASS}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Interest</span>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <SearchableProductSelect
                        products={products}
                        value={form.interest_product_id}
                        loading={loadingProducts}
                        onValueChange={(productId) =>
                          setForm((prev) => ({
                            ...prev,
                            interest_product_id: productId,
                            interest_text: "",
                          }))
                        }
                      />
                    </div>
                    {form.interest_product_id && (
                      <button
                        type="button"
                        onClick={() => updateForm("interest_product_id", "")}
                        className="rounded-xl border border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {!form.interest_product_id && (
                    <input
                      aria-label="Interest (free text)"
                      value={form.interest_text}
                      onChange={(event) => updateForm("interest_text", event.target.value)}
                      maxLength={200}
                      placeholder="Not in the list? Type it here, e.g. reta 10mg"
                      className={FIELD_CLASS}
                    />
                  )}
                </div>

                <Field label="Rejection">
                  <select
                    value={form.rejection}
                    onChange={(event) => updateForm("rejection", event.target.value)}
                    className={FIELD_CLASS}
                  >
                    <option value="">None</option>
                    {REJECTION_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Chat date" required hint="Follow-ups are H+1, H+3 and H+7 from this date.">
                  <input
                    type="date"
                    value={form.chat_date}
                    max={today}
                    onChange={(event) => updateForm("chat_date", event.target.value)}
                    required
                    className={`${FIELD_CLASS} [color-scheme:dark]`}
                  />
                </Field>

                {isEdit && (
                  <>
                    <Field label="Domicile">
                      <input
                        value={form.domicile}
                        onChange={(event) => updateForm("domicile", event.target.value)}
                        maxLength={160}
                        className={FIELD_CLASS}
                      />
                    </Field>
                    <Field label="Goal">
                      <input
                        value={form.goal}
                        onChange={(event) => updateForm("goal", event.target.value)}
                        maxLength={500}
                        className={FIELD_CLASS}
                      />
                    </Field>
                    <Field label="Notes" className="md:col-span-2">
                      <textarea
                        value={form.notes}
                        onChange={(event) => updateForm("notes", event.target.value)}
                        rows={3}
                        maxLength={4000}
                        className={`${FIELD_CLASS} resize-none`}
                      />
                    </Field>
                    <label className="flex items-start gap-3 rounded-xl border border-border px-4 py-3 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={form.is_customer}
                        onChange={(event) => updateForm("is_customer", event.target.checked)}
                        className="mt-0.5 h-4 w-4"
                      />
                      <span>
                        <span className="block text-sm text-foreground">Already a customer</span>
                        <span className="block text-xs text-muted-foreground">
                          Set automatically once an order on this WhatsApp number is paid
                          (!invoice, panel, or website). Customers no longer show in !followup.
                        </span>
                      </span>
                    </label>
                  </>
                )}
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
                  {isEdit ? "Save Changes" : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
