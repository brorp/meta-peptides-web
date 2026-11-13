import { z } from "zod";

export const KPI_RULES = {
  reply_late: { label: "Balas chat lebih dari 30 menit", points: 1 },
  consultation_abandoned: {
    label: "Konsultasi / trial closing ditinggal",
    points: 2,
  },
  data_entry_late: {
    label: "Data customer / transaksi tidak diinput hari yang sama",
    points: 2,
  },
  daily_report_missing: {
    label: "Daily report tidak dikirim tepat waktu",
    points: 2,
  },
  order_processing_late: { label: "Order terlambat diproses", points: 5 },
} as const;
export type KpiRule = keyof typeof KPI_RULES;
export const RULE_KEYS = Object.keys(KPI_RULES) as KpiRule[];
export const KPI_MIGRATION_MESSAGE =
  "Supervisi CS belum diaktifkan di database. Jalankan migration 20261113090000 dan 20261113091000.";

export function dateWib(value: Date | string = new Date()) {
  return new Date(new Date(value).getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
}
export function validDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}
export function nextDate(value: string, days = 1) {
  return new Date(new Date(`${value}T00:00:00Z`).getTime() + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function atWib(day: string, time: string) {
  return new Date(`${day}T${time}:00+07:00`);
}
export function monthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month) || !validDate(`${month}-01`)) return null;
  const next = new Date(`${month}-01T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return {
    from: atWib(`${month}-01`, "00:00").toISOString(),
    until: atWib(next.toISOString().slice(0, 10), "00:00").toISOString(),
  };
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const kpiConfigSchema = z
  .object({
    enabled: z.boolean(),
    work_days: z.array(z.number().int().min(0).max(6)).max(7),
    work_start: time,
    work_end: time,
    off_dates: z.array(z.string().refine(validDate)).max(366),
    abandon_after_minutes: z.number().int().min(31).max(1440),
    report_deadline: time,
    default_admin_id: z.string().uuid().nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.work_end <= value.work_start)
      ctx.addIssue({
        code: "custom",
        message: "Jam selesai harus setelah jam mulai.",
      });
    if (
      value.report_deadline < value.work_start ||
      value.report_deadline > value.work_end
    )
      ctx.addIssue({
        code: "custom",
        message: "Batas laporan harus dalam jam kerja.",
      });
    if (value.enabled && (!value.work_days.length || !value.default_admin_id))
      ctx.addIssue({
        code: "custom",
        message: "Pilih PIC dan hari kerja sebelum mengaktifkan supervisi.",
      });
  });
export type KpiConfig = z.infer<typeof kpiConfigSchema>;
export const DEFAULT_KPI_CONFIG: KpiConfig = {
  enabled: false,
  work_days: [0, 1, 2, 3, 4, 5, 6],
  work_start: "10:00",
  work_end: "22:00",
  off_dates: [],
  abandon_after_minutes: 180,
  report_deadline: "22:00",
  default_admin_id: null,
};
export function isWorkday(day: string, config: KpiConfig) {
  return (
    config.work_days.includes(new Date(`${day}T12:00:00Z`).getUTCDay()) &&
    !config.off_dates.includes(day)
  );
}
export function workingMinutes(
  start: string | Date,
  end: string | Date,
  config: KpiConfig,
) {
  const from = new Date(start).getTime(),
    until = new Date(end).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from)
    return 0;
  let total = 0;
  for (
    let day = dateWib(new Date(from));
    day <= dateWib(new Date(until));
    day = nextDate(day)
  ) {
    if (isWorkday(day, config))
      total += Math.max(
        0,
        Math.min(until, atWib(day, config.work_end).getTime()) -
          Math.max(from, atWib(day, config.work_start).getTime()),
      );
  }
  return total / 60000;
}
export function workingDeadline(
  start: string | Date,
  minutes: number,
  config: KpiConfig,
) {
  let remaining = minutes,
    cursor = new Date(start).getTime();
  for (
    let count = 0, day = dateWib(new Date(cursor));
    count < 740;
    count++, day = nextDate(day)
  ) {
    if (!isWorkday(day, config)) continue;
    const from = Math.max(cursor, atWib(day, config.work_start).getTime());
    const available = Math.max(
      0,
      (atWib(day, config.work_end).getTime() - from) / 60000,
    );
    if (available >= remaining)
      return new Date(from + remaining * 60000).toISOString();
    remaining -= available;
  }
  throw new Error("Jadwal tidak menyediakan hari kerja yang cukup.");
}

// Messages received after closing or on a day off belong to the next shift
// for same-day data entry. They cannot create an immediate night-time flag.
function entryBusinessDate(sentAt: string, config: KpiConfig) {
  for (
    let count = 0, day = dateWib(sentAt);
    count < 740;
    count++, day = nextDate(day)
  ) {
    if (
      isWorkday(day, config) &&
      new Date(sentAt) < atWib(day, config.work_end)
    )
      return day;
  }
  throw new Error("Jadwal tidak menyediakan hari kerja yang cukup.");
}

export type KpiAdmin = {
  id: string;
  name: string;
  active: boolean;
  report_required: boolean;
  work_days: number[];
  created_at: string;
  discord_user_id?: string | null;
};
export type KpiMessage = {
  id: string;
  chat_phone: string;
  lead_id: string | null;
  direction: "in" | "out";
  body: string | null;
  sent_at: string;
  message_type: string;
};
export type KpiLead = {
  id: string;
  full_name: string;
  whatsapp_phone: string;
  status?: string;
  chat_date: string;
  cs_recorded_at: string;
  source_message_id?: string | null;
};
export type KpiOrder = {
  id: string;
  invoice_number?: string | null;
  lead_id?: string | null;
  shipping_phone?: string | null;
  order_source: string;
  status: string;
  is_paid: boolean;
  paid_at?: string | null;
  created_at: string;
  cs_recorded_at: string;
  cs_processed_at: string | null;
};
export type KpiReport = {
  id: string;
  admin_id: string;
  report_date: string;
  sent_at: string;
  summary?: string;
  follow_up?: string;
  blockers?: string;
  source?: string;
  recorded_by?: string;
  evidence_url?: string | null;
};
export type KpiCandidate = {
  incident_key: string;
  rule: KpiRule;
  admin_id: string | null;
  occurred_at: string;
  evidence: Record<string, unknown>;
  source: "automatic" | "manual";
};

const onlyAcknowledgement =
  /^(?:ok(?:e|ay)?|siap|baik|makasih|terima\s*kasih|thanks|thank\s*you)(?:\s+(?:kak|ya|bang|pak|bu))?[\s.!🙏👍😊]*$/i;
const consultation =
  /konsult|trial\s*closing|dosis|cara\s+(?:pakai|penggunaan)|mau\s+(?:order|pesan|beli)|nomor\s*rekening|sudah\s*(?:transfer|bayar)|checkout/i;
const paidMessage =
  /(?:sudah|udah|barusan|telah)\s+(?:saya\s+)?(?:transfer|bayar)|(?:transfer|pembayaran)\s+(?:sudah|berhasil|selesai)/i;
const futurePayment =
  /(?:belum|nanti|akan|mau)\s+(?:saya\s+)?(?:transfer|bayar)/i;
const excerpt = (message: KpiMessage) => ({
  id: message.id,
  direction: message.direction,
  sent_at: message.sent_at,
  message_type: message.message_type,
  text: message.body?.slice(0, 500) || `[${message.message_type}]`,
});
const phone = (value?: string | null) =>
  String(value || "")
    .replace(/\D/g, "")
    .replace(/^0/, "62");

export function detectKpiCandidates(input: {
  config: KpiConfig;
  monitoringStartedAt: string;
  chatObservationStartedAt?: string;
  now: string;
  admins: KpiAdmin[];
  messages: KpiMessage[];
  leads: KpiLead[];
  orders: KpiOrder[];
  reports: KpiReport[];
}): KpiCandidate[] {
  const { config, now, monitoringStartedAt, admins, leads, orders, reports } =
    input;
  if (!config.enabled) return [];
  const activeAdmin = admins.find(
    (admin) => admin.id === config.default_admin_id && admin.active,
  );
  const owner = activeAdmin?.id || null;
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const candidates = new Map<string, KpiCandidate>();
  function record(
    key: string,
    rule: KpiRule,
    occurredAt: string,
    evidence: Record<string, unknown>,
    adminId = owner,
  ) {
    if (new Date(occurredAt) > new Date(now)) return;
    candidates.set(key, {
      incident_key: key,
      rule,
      admin_id: adminId,
      occurred_at: occurredAt,
      source: "automatic",
      evidence: {
        ...evidence,
        observed_at: now,
        schedule: {
          work_start: config.work_start,
          work_end: config.work_end,
          work_days: config.work_days,
          off_dates: config.off_dates,
        },
        attribution: "PIC nomor CS bersama; periksa sebelum mengesahkan.",
      },
    });
  }

  const chats = new Map<string, KpiMessage[]>();
  for (const message of input.messages) {
    if (
      new Date(message.sent_at) <
        new Date(input.chatObservationStartedAt || monitoringStartedAt) ||
      new Date(message.sent_at) < new Date(monitoringStartedAt) ||
      new Date(message.sent_at) > new Date(now)
    )
      continue;
    if (message.lead_id && leadById.get(message.lead_id)?.status === "skip")
      continue;
    const group = chats.get(message.chat_phone) || [];
    group.push(message);
    chats.set(message.chat_phone, group);
  }
  for (const [chatPhone, messages] of chats) {
    messages.sort(
      (a, b) => a.sent_at.localeCompare(b.sent_at) || a.id.localeCompare(b.id),
    );
    let waiting: KpiMessage | null = null;
    let context: KpiMessage[] = [];
    function checkEpisode(end: string, reply?: KpiMessage) {
      if (!waiting) return;
      const elapsed = workingMinutes(waiting.sent_at, end, config);
      if (elapsed <= 30) return;
      const abandoned =
        elapsed > config.abandon_after_minutes &&
        context.some((message) => consultation.test(message.body || ""));
      const rule = abandoned ? "consultation_abandoned" : "reply_late";
      const threshold = abandoned ? config.abandon_after_minutes : 30;
      record(
        `reply:${chatPhone}:${waiting.id}`,
        rule,
        workingDeadline(waiting.sent_at, threshold, config),
        {
          phone: chatPhone,
          lead_id: waiting.lead_id,
          customer: leadById.get(waiting.lead_id || "")?.full_name || chatPhone,
          first_unanswered_at: waiting.sent_at,
          replied_at: reply?.sent_at || null,
          working_minutes: Math.round(elapsed * 100) / 100,
          threshold_minutes: threshold,
          reason: abandoned
            ? "Indikasi konsultasi / closing menunggu lebih dari batas; konteks wajib ditinjau direksi."
            : "Pesan customer menunggu balasan lebih dari 30 menit kerja.",
          messages: [
            waiting,
            ...context
              .filter((message) => message.id !== waiting!.id)
              .slice(-4),
            ...(reply ? [reply] : []),
          ].map(excerpt),
        },
      );
    }
    for (const message of messages) {
      if (message.direction === "out") {
        checkEpisode(message.sent_at, message);
        waiting = null;
        context = [message];
      } else {
        if (
          !waiting &&
          (message.message_type !== "text" ||
            !onlyAcknowledgement.test(message.body || ""))
        )
          waiting = message;
        context.push(message);
        const day = entryBusinessDate(message.sent_at, config);
        const cutoff = atWib(day, config.work_end).toISOString();
        if (
          paidMessage.test(message.body || "") &&
          !futurePayment.test(message.body || "") &&
          new Date(now) > new Date(cutoff)
        ) {
          const entered = orders.some(
            (order) =>
              ((order.lead_id === message.lead_id && message.lead_id) ||
                phone(order.shipping_phone) === chatPhone) &&
              dateWib(order.cs_recorded_at) === day,
          );
          if (!entered)
            record(`data:${chatPhone}:${day}`, "data_entry_late", cutoff, {
              phone: chatPhone,
              lead_id: message.lead_id,
              reason:
                "Ada indikasi customer sudah membayar, tetapi order hari yang sama belum terlihat. Bukti bayar dan kelengkapan data perlu diverifikasi.",
              messages: [excerpt(message)],
            });
        }
      }
    }
    checkEpisode(now);
  }

  for (const lead of leads) {
    if (
      lead.status === "skip" ||
      new Date(lead.cs_recorded_at) < new Date(monitoringStartedAt) ||
      lead.source_message_id?.startsWith("wa:")
    )
      continue;
    if (
      validDate(lead.chat_date) &&
      lead.chat_date < dateWib(lead.cs_recorded_at)
    ) {
      record(
        `data:${lead.whatsapp_phone}:${lead.chat_date}`,
        "data_entry_late",
        lead.cs_recorded_at,
        {
          lead_id: lead.id,
          phone: lead.whatsapp_phone,
          customer: lead.full_name,
          chat_date: lead.chat_date,
          recorded_at: lead.cs_recorded_at,
          reason:
            "Tanggal chat lebih awal daripada waktu pencatatan lead yang tercatat di database.",
        },
      );
    }
  }
  for (const order of orders) {
    if (
      new Date(order.cs_recorded_at) < new Date(monitoringStartedAt) ||
      order.status === "cancelled"
    )
      continue;
    const orderDay = dateWib(order.created_at);
    if (orderDay < dateWib(order.cs_recorded_at))
      record(
        `data:${phone(order.shipping_phone) || order.id}:${orderDay}`,
        "data_entry_late",
        order.cs_recorded_at,
        {
          order_id: order.id,
          invoice: order.invoice_number || order.id,
          order_date: order.created_at,
          recorded_at: order.cs_recorded_at,
          reason:
            "Tanggal order dibukukan lebih awal daripada waktu input aktual. Periksa apakah backdate ini termasuk pelanggaran.",
        },
      );
    if (
      !order.is_paid ||
      !["manual_whatsapp", "shopee", "tokopedia"].includes(order.order_source)
    )
      continue;
    const start =
      order.paid_at && new Date(order.paid_at) > new Date(order.cs_recorded_at)
        ? order.paid_at
        : order.cs_recorded_at;
    const end = order.cs_processed_at || now;
    const threshold =
      order.order_source === "shopee" || order.order_source === "tokopedia"
        ? 120
        : 60;
    const elapsed = workingMinutes(start, end, config);
    if (elapsed > threshold)
      record(
        `order:${order.id}`,
        "order_processing_late",
        workingDeadline(start, threshold, config),
        {
          order_id: order.id,
          invoice: order.invoice_number || order.id,
          order_source: order.order_source,
          received_at: start,
          processed_at: order.cs_processed_at,
          working_minutes: Math.round(elapsed * 100) / 100,
          threshold_minutes: threshold,
          reason:
            "Order lunas melewati batas kerja sebelum status processing/completed atau resi asli tercatat. Waktu pesanan marketplace sebelum masuk sistem belum terukur.",
        },
      );
  }

  const firstDay = dateWib(monitoringStartedAt);
  for (const admin of admins.filter(
    (person) => person.active && person.report_required,
  )) {
    for (let day = firstDay; day <= dateWib(now); day = nextDate(day)) {
      if (
        !isWorkday(day, config) ||
        !admin.work_days.includes(new Date(`${day}T12:00:00Z`).getUTCDay()) ||
        day < dateWib(admin.created_at)
      )
        continue;
      const deadline = atWib(day, config.report_deadline).toISOString();
      if (
        new Date(deadline) < new Date(monitoringStartedAt) ||
        new Date(now) <= new Date(deadline)
      )
        continue;
      const report = reports.find(
        (row) =>
          row.admin_id === admin.id &&
          row.report_date === day &&
          new Date(row.sent_at) <= new Date(deadline),
      );
      if (!report)
        record(
          `report:${admin.id}:${day}`,
          "daily_report_missing",
          deadline,
          {
            report_date: day,
            deadline_at: deadline,
            reason:
              "Belum ada Daily Report panel yang terkirim sebelum batas waktu. Periksa izin / kondisi khusus sebelum mengesahkan.",
            late_report:
              reports.find(
                (row) => row.admin_id === admin.id && row.report_date === day,
              ) || null,
          },
          admin.id,
        );
    }
  }
  return [...candidates.values()];
}

export function summarizeKpi(
  findings: Array<{
    status: string;
    points: number;
    admin_id: string | null;
    rule: string;
  }>,
  admins: KpiAdmin[],
) {
  const byAdmin = admins.map((admin) => ({
    admin_id: admin.id,
    name: admin.name,
    confirmed_points: 0,
    confirmed_count: 0,
    pending_count: 0,
    by_rule: Object.fromEntries(RULE_KEYS.map((rule) => [rule, 0])) as Record<
      string,
      number
    >,
  }));
  for (const finding of findings) {
    const row = byAdmin.find((admin) => admin.admin_id === finding.admin_id);
    if (!row) continue;
    if (finding.status === "pending") row.pending_count++;
    if (finding.status === "confirmed") {
      row.confirmed_count++;
      row.confirmed_points += finding.points;
      row.by_rule[finding.rule] =
        (row.by_rule[finding.rule] || 0) + finding.points;
    }
  }
  return {
    by_admin: byAdmin,
    pending: findings.filter((row) => row.status === "pending").length,
    confirmed: findings.filter((row) => row.status === "confirmed").length,
    dismissed: findings.filter((row) => row.status === "dismissed").length,
    confirmed_points: findings
      .filter((row) => row.status === "confirmed")
      .reduce((sum, row) => sum + row.points, 0),
  };
}
