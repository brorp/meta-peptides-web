import type {
  KpiAdmin,
  KpiConfig,
  KpiReport,
  KpiRule,
} from "@/lib/cs-kpi-core";
export type KpiFinding = {
  id: string;
  incident_key: string;
  rule: KpiRule;
  admin_id: string | null;
  points: number;
  occurred_at: string;
  detected_at: string;
  status: "pending" | "confirmed" | "dismissed";
  source: "automatic" | "manual";
  version: number;
  reviewer: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  evidence: {
    reason?: string;
    phone?: string;
    customer?: string;
    lead_id?: string;
    order_id?: string;
    invoice?: string;
    evidence_url?: string;
    first_unanswered_at?: string;
    replied_at?: string;
    recorded_at?: string;
    received_at?: string;
    processed_at?: string;
    deadline_at?: string;
    report_date?: string;
    working_minutes?: number;
    threshold_minutes?: number;
    messages?: Array<{
      id: string;
      direction: "in" | "out";
      sent_at: string;
      message_type: string;
      text: string;
    }>;
    schedule?: { work_start: string; work_end: string };
    [key: string]: unknown;
  };
};
export type KpiDashboard = {
  config: KpiConfig;
  admins: KpiAdmin[];
  monitoring_started_at: string | null;
  last_scan_at: string | null;
  last_scan_count: number | null;
  last_scan_error: string | null;
  listener_heartbeat_at: string | null;
  listener_connected: boolean;
  chat_observed_from: string | null;
  month: string;
  findings: KpiFinding[];
  reports: KpiReport[];
  pagination: { page: number; total: number; total_pages: number };
  summary: {
    pending: number;
    confirmed: number;
    dismissed: number;
    confirmed_points: number;
    by_admin: Array<{
      admin_id: string;
      name: string;
      confirmed_points: number;
      confirmed_count: number;
      pending_count: number;
      by_rule: Record<string, number>;
    }>;
  };
};
