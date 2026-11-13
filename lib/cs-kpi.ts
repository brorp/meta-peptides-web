import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  DEFAULT_KPI_CONFIG,
  KPI_MIGRATION_MESSAGE,
  dateWib,
  detectKpiCandidates,
  kpiConfigSchema,
  monthRange,
  summarizeKpi,
  type KpiAdmin,
  type KpiLead,
  type KpiMessage,
  type KpiOrder,
  type KpiReport,
} from "@/lib/cs-kpi-core";

export class KpiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}
export async function kpiRows<T>(
  query: (from: number, to: number) => any,
): Promise<T[]> {
  const result: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error) throw new KpiError("Gagal memuat data supervisi CS.");
    result.push(...(data || []));
    if (!data || data.length < 500) return result;
  }
}
export async function loadKpiState() {
  const [settings, people] = await Promise.all([
    supabaseAdmin
      .from("cs_kpi_settings")
      .select(
        "config, monitoring_started_at, updated_at, last_scan_at, last_scan_count, last_scan_error, listener_heartbeat_at, listener_connected, chat_observed_from",
      )
      .eq("singleton", true)
      .single(),
    supabaseAdmin.from("cs_kpi_admins").select("*").order("created_at"),
  ]);
  if (settings.error || people.error || !settings.data)
    throw new KpiError(KPI_MIGRATION_MESSAGE, 503);
  const parsed = kpiConfigSchema.safeParse({
    ...DEFAULT_KPI_CONFIG,
    ...settings.data.config,
  });
  if (!parsed.success)
    throw new KpiError(
      "Pengaturan supervisi CS tidak valid. Periksa jadwal dan PIC.",
      503,
    );
  return {
    ...settings.data,
    config: parsed.data,
    admins: (people.data || []) as KpiAdmin[],
  };
}

export async function runKpiScan() {
  const state = await loadKpiState();
  if (!state.config.enabled || !state.monitoring_started_at)
    return { status: "disabled", recorded: 0 };
  const token = randomUUID();
  const lock = await supabaseAdmin.rpc("cs_kpi_acquire_scan", {
    p_token: token,
  });
  if (lock.error) throw new KpiError("Gagal memulai pemeriksaan KPI.");
  if (!lock.data) return { status: "running", recorded: 0 };
  const now = new Date().toISOString();
  let recorded = 0;
  try {
    const chatAvailable =
      state.listener_connected &&
      state.listener_heartbeat_at &&
      state.chat_observed_from &&
      Date.now() - new Date(state.listener_heartbeat_at).getTime() < 5 * 60000;
    const chatStart =
      chatAvailable && state.chat_observed_from > state.monitoring_started_at
        ? state.chat_observed_from
        : state.monitoring_started_at;
    const [messages, leads, orders, reports, ignored] = await Promise.all([
      chatAvailable
        ? kpiRows<KpiMessage>((from, to) =>
            supabaseAdmin
              .from("whatsapp_messages")
              .select(
                "id, chat_phone, lead_id, direction, body, sent_at, message_type",
              )
              .gte("sent_at", chatStart)
              .lte("sent_at", now)
              .order("sent_at")
              .order("id")
              .range(from, to),
          )
        : Promise.resolve([] as KpiMessage[]),
      kpiRows<KpiLead>((from, to) =>
        supabaseAdmin
          .from("leads")
          .select(
            "id, full_name, whatsapp_phone, status, chat_date, cs_recorded_at, source_message_id",
          )
          .order("id")
          .range(from, to),
      ),
      kpiRows<KpiOrder>((from, to) =>
        supabaseAdmin
          .from("orders")
          .select(
            "id, invoice_number, lead_id, shipping_phone, order_source, status, is_paid, paid_at, created_at, cs_recorded_at, cs_processed_at",
          )
          .gte("cs_recorded_at", state.monitoring_started_at)
          .lte("cs_recorded_at", now)
          .order("id")
          .range(from, to),
      ),
      kpiRows<KpiReport>((from, to) =>
        supabaseAdmin
          .from("cs_kpi_daily_reports")
          .select("id, admin_id, report_date, sent_at")
          .order("id")
          .range(from, to),
      ),
      kpiRows<{ phone: string }>((from, to) =>
        supabaseAdmin
          .from("whatsapp_ignored_numbers")
          .select("phone")
          .order("phone")
          .range(from, to),
      ),
    ]);
    const ignoredPhones = new Set(ignored.map((row) => row.phone));
    const candidates = detectKpiCandidates({
      config: state.config,
      monitoringStartedAt: state.monitoring_started_at,
      chatObservationStartedAt: chatStart,
      now,
      admins: state.admins,
      messages: messages.filter(
        (message) => !ignoredPhones.has(message.chat_phone),
      ),
      leads,
      orders,
      reports,
    });
    for (let offset = 0; offset < candidates.length; offset += 100) {
      const batch = await supabaseAdmin.rpc("cs_kpi_record_batch", {
        p_findings: candidates.slice(offset, offset + 100),
      });
      if (batch.error)
        throw new KpiError("Gagal menyimpan temuan supervisi CS.");
      recorded += Number(batch.data || 0);
    }
    const saved = await supabaseAdmin
      .from("cs_kpi_settings")
      .update({
        last_scan_at: now,
        last_scan_count: recorded,
        last_scan_error: null,
        lease_token: null,
        lease_until: null,
      })
      .eq("singleton", true)
      .eq("lease_token", token);
    if (saved.error)
      throw new KpiError("Gagal mencatat hasil pemeriksaan KPI.");
    return {
      status: "completed",
      recorded,
      chat_available: Boolean(chatAvailable),
    };
  } catch (error) {
    await supabaseAdmin
      .from("cs_kpi_settings")
      .update({
        last_scan_error:
          "Pemeriksaan gagal. Sebagian temuan mungkin belum tercatat; jalankan ulang.",
        lease_token: null,
        lease_until: null,
      })
      .eq("singleton", true)
      .eq("lease_token", token);
    throw error;
  }
}

export async function loadKpiDashboard(params: URLSearchParams) {
  const month = params.get("month") || dateWib().slice(0, 7);
  const range = monthRange(month);
  if (!range) throw new KpiError("Bulan wajib format YYYY-MM.", 400);
  const state = await loadKpiState();
  const status = params.get("status") || "";
  if (status && !["pending", "confirmed", "dismissed"].includes(status))
    throw new KpiError("Status tidak valid.", 400);
  const admin = params.get("admin_id") || "";
  if (admin && !state.admins.some((row) => row.id === admin))
    throw new KpiError("Admin tidak ditemukan.", 400);
  const page = Math.max(
    1,
    Math.min(100000, Math.floor(Number(params.get("page")) || 1)),
  );
  const monthly = await kpiRows<{
    status: string;
    points: number;
    admin_id: string | null;
    rule: string;
  }>((from, to) =>
    supabaseAdmin
      .from("cs_kpi_findings")
      .select("status, points, admin_id, rule")
      .gte("occurred_at", range.from)
      .lt("occurred_at", range.until)
      .order("id")
      .range(from, to),
  );
  let query = supabaseAdmin
    .from("cs_kpi_findings")
    .select("*", { count: "exact" })
    .gte("occurred_at", range.from)
    .lt("occurred_at", range.until);
  if (status) query = query.eq("status", status);
  if (admin) query = query.eq("admin_id", admin);
  const [findings, reports] = await Promise.all([
    query
      .order("occurred_at", { ascending: false })
      .order("id")
      .range((page - 1) * 25, page * 25 - 1),
    kpiRows<KpiReport>((from, to) =>
      supabaseAdmin
        .from("cs_kpi_daily_reports")
        .select("*")
        .gte("report_date", `${month}-01`)
        .lt("report_date", dateWib(range.until))
        .order("report_date", { ascending: false })
        .order("id")
        .range(from, to),
    ),
  ]);
  if (findings.error) throw new KpiError("Gagal memuat log supervisi.");
  return {
    ...state,
    month,
    summary: summarizeKpi(monthly, state.admins),
    findings: findings.data || [],
    reports,
    pagination: {
      page,
      total: findings.count || 0,
      total_pages: Math.max(1, Math.ceil((findings.count || 0) / 25)),
    },
  };
}
