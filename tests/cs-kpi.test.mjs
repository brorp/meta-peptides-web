import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_KPI_CONFIG,
  workingMinutes,
  workingDeadline,
  detectKpiCandidates,
  summarizeKpi,
  monthRange,
  kpiConfigSchema,
} from "../lib/cs-kpi-core.ts";

const adminId = "00000000-0000-4000-8000-000000000001";
const config = {
  ...DEFAULT_KPI_CONFIG,
  enabled: true,
  default_admin_id: adminId,
};
const at = (day, time) => `${day}T${time}:00+07:00`;
const admins = [
  {
    id: adminId,
    name: "CS",
    active: true,
    report_required: true,
    work_days: [0, 1, 2, 3, 4, 5, 6],
    created_at: at("2026-11-13", "10:00"),
  },
];
const msg = (
  id,
  time,
  body = "Ada stok?",
  direction = "in",
  day = "2026-11-13",
) => ({
  id,
  chat_phone: "628123",
  lead_id: "lead1",
  direction,
  body,
  sent_at: at(day, time),
  message_type: "text",
});
const detect = (input = {}) =>
  detectKpiCandidates({
    config,
    monitoringStartedAt: at("2026-11-13", "10:00"),
    now: at("2026-11-13", "14:00"),
    admins,
    messages: [],
    leads: [],
    orders: [],
    reports: [],
    ...input,
  });
const order = (source = "manual_whatsapp", extras = {}) => ({
  id: "order1",
  order_source: source,
  status: "pending",
  is_paid: true,
  created_at: at("2026-11-13", "10:00"),
  cs_recorded_at: at("2026-11-13", "10:00"),
  cs_processed_at: null,
  ...extras,
});

test("working time pauses outside 10–22 WIB, including across a month", () => {
  assert.equal(
    workingMinutes(
      at("2026-11-13", "21:45"),
      at("2026-11-14", "10:15"),
      config,
    ),
    30,
  );
  assert.equal(
    workingMinutes(
      at("2026-11-13", "22:00"),
      at("2026-11-14", "10:00"),
      config,
    ),
    0,
  );
  assert.equal(
    workingMinutes(
      at("2026-11-13", "08:00"),
      at("2026-11-13", "10:31"),
      config,
    ),
    31,
  );
  assert.equal(
    workingDeadline(at("2026-11-30", "21:45"), 30, config),
    new Date(at("2026-12-01", "10:15")).toISOString(),
  );
  assert.equal(
    workingMinutes(at("2026-11-13", "10:00"), at("2026-11-15", "11:00"), {
      ...config,
      off_dates: ["2026-11-14"],
    }),
    780,
  );
  assert.equal(
    workingMinutes(at("2026-11-14", "10:00"), at("2026-11-15", "11:00"), {
      ...config,
      work_days: [1, 2, 3, 4, 5],
    }),
    0,
  );
});

test("reply boundary is strictly over 30 working minutes and bursts do not restart it", () => {
  assert.equal(
    detect({ messages: [msg("a", "10:00")], now: at("2026-11-13", "10:30") })
      .length,
    0,
  );
  const rows = detect({
    messages: [
      msg("a", "10:00"),
      msg("b", "10:29"),
      msg("c", "10:31", "Ada kak", "out"),
    ],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rule, "reply_late");
  assert.equal(rows[0].evidence.working_minutes, 31);
  assert.equal(rows[0].incident_key, "reply:628123:a");
  assert.equal(rows[0].evidence.replied_at, at("2026-11-13", "10:31"));
});

test("night-time waits continue in the next shift without night penalties", () => {
  const messages = [msg("a", "21:45")];
  assert.equal(
    detect({ messages, now: at("2026-11-14", "10:15") }).filter(
      (r) => r.rule === "reply_late",
    ).length,
    0,
  );
  assert.equal(
    detect({ messages, now: at("2026-11-14", "10:16") }).filter(
      (r) => r.rule === "reply_late",
    ).length,
    1,
  );
});

test("a consultation becomes one 2-point incident after 3 working hours", () => {
  const messages = [msg("a", "10:00", "Mau konsultasi dosis")];
  const first = detect({ messages, now: at("2026-11-13", "13:00") });
  const later = detect({ messages, now: at("2026-11-13", "13:01") });
  assert.equal(first[0].rule, "reply_late");
  assert.equal(later.length, 1);
  assert.equal(later[0].rule, "consultation_abandoned");
  assert.equal(later[0].incident_key, first[0].incident_key);
  assert.equal(
    detect({ messages: [msg("a", "10:00", "Ada stok?")] })[0].rule,
    "reply_late",
  );
});

test("acknowledgements, future messages, skipped contacts and pre-coverage chats do not create flags", () => {
  assert.equal(
    detect({ messages: [msg("a", "10:00", "Terima kasih kak 🙏")] }).length,
    0,
  );
  assert.equal(detect({ messages: [msg("a", "15:00")] }).length, 0);
  assert.equal(
    detect({
      messages: [msg("a", "10:00")],
      chatObservationStartedAt: at("2026-11-13", "11:00"),
    }).length,
    0,
  );
  assert.equal(
    detect({
      messages: [msg("a", "10:00")],
      leads: [{ id: "lead1", status: "skip" }],
    }).length,
    0,
  );
  assert.equal(
    detect({
      config: { ...config, enabled: false },
      messages: [msg("a", "10:00")],
    }).length,
    0,
  );
});

test("same-day data flags use payment indications and defer after-hours messages", () => {
  const rows = detect({
    messages: [
      msg("a", "12:00", "Sudah saya transfer"),
      msg("b", "12:01", "Terima kasih", "out"),
    ],
    now: at("2026-11-13", "22:01"),
  });
  assert.equal(rows.filter((r) => r.rule === "data_entry_late").length, 1);
  assert.equal(
    detect({
      messages: [msg("a", "23:00", "Sudah transfer")],
      now: at("2026-11-13", "23:01"),
    }).filter((r) => r.rule === "data_entry_late").length,
    0,
  );
  assert.equal(
    detect({
      messages: [msg("a", "23:00", "Sudah transfer")],
      now: at("2026-11-14", "21:59"),
    }).filter((r) => r.rule === "data_entry_late").length,
    0,
  );
  assert.equal(
    detect({
      messages: [msg("a", "12:00", "Nanti saya bayar")],
      now: at("2026-11-13", "22:01"),
    }).filter((r) => r.rule === "data_entry_late").length,
    0,
  );
  assert.equal(
    detect({
      messages: [msg("a", "12:00", "Sudah saya transfer")],
      orders: [order("manual_whatsapp", { lead_id: "lead1" })],
      now: at("2026-11-13", "22:01"),
    }).filter((r) => r.rule === "data_entry_late").length,
    0,
  );
});

test("backdated manual input is flagged but auto-created WA leads and old records are excluded", () => {
  const lead = {
    id: "l",
    full_name: "Test",
    whatsapp_phone: "628123",
    chat_date: "2026-11-12",
    cs_recorded_at: at("2026-11-13", "11:00"),
  };
  assert.equal(detect({ leads: [lead] })[0].rule, "data_entry_late");
  assert.equal(detect({ leads: [{ ...lead, status: "skip" }] }).length, 0);
  assert.equal(
    detect({ leads: [{ ...lead, source_message_id: "wa:test" }] }).length,
    0,
  );
  assert.equal(
    detect({ leads: [{ ...lead, cs_recorded_at: at("2026-11-12", "11:00") }] })
      .length,
    0,
  );
});

test("processing uses actual paid/recorded times, 60 minutes WA and 120 marketplace", () => {
  assert.equal(
    detect({ orders: [order()], now: at("2026-11-13", "11:00") }).length,
    0,
  );
  assert.equal(
    detect({ orders: [order()], now: at("2026-11-13", "11:01") })[0].rule,
    "order_processing_late",
  );
  assert.equal(
    detect({ orders: [order("shopee")], now: at("2026-11-13", "12:00") })
      .length,
    0,
  );
  assert.equal(
    detect({ orders: [order("tokopedia")], now: at("2026-11-13", "12:01") })[0]
      .evidence.threshold_minutes,
    120,
  );
  assert.equal(
    detect({
      orders: [
        order("manual_whatsapp", {
          cs_processed_at: at("2026-11-13", "10:30"),
        }),
      ],
    }).length,
    0,
  );
  assert.equal(
    detect({
      orders: [
        order("manual_whatsapp", { paid_at: at("2026-11-13", "13:30") }),
      ],
    }).length,
    0,
  );
  assert.equal(
    detect({
      orders: [
        order("manual_whatsapp", { status: "cancelled" }),
        order("checkout"),
        order("manual_whatsapp", { is_paid: false }),
      ],
    }).length,
    0,
  );
});

test("daily report must be sent by 22:00; late submission cannot erase a deadline miss", () => {
  assert.equal(detect({ now: at("2026-11-13", "22:00") }).length, 0);
  const input = { now: at("2026-11-13", "22:01") };
  assert.equal(detect(input)[0].rule, "daily_report_missing");
  const report = {
    id: "r",
    admin_id: adminId,
    report_date: "2026-11-13",
    sent_at: at("2026-11-13", "22:00"),
  };
  assert.equal(detect({ ...input, reports: [report] }).length, 0);
  assert.equal(
    detect({
      ...input,
      reports: [{ ...report, sent_at: at("2026-11-13", "22:01") }],
    })[0].rule,
    "daily_report_missing",
  );
  assert.equal(
    detect({ ...input, config: { ...config, off_dates: ["2026-11-13"] } })
      .length,
    0,
  );
  assert.equal(
    detect({ ...input, monitoringStartedAt: at("2026-11-13", "22:01") }).length,
    0,
  );
});

test("monthly scores include confirmed violations only, with WIB month boundaries", () => {
  const summary = summarizeKpi(
    [
      { admin_id: adminId, rule: "reply_late", points: 1, status: "confirmed" },
      {
        admin_id: adminId,
        rule: "order_processing_late",
        points: 5,
        status: "pending",
      },
      {
        admin_id: adminId,
        rule: "daily_report_missing",
        points: 2,
        status: "dismissed",
      },
    ],
    admins,
  );
  assert.equal(summary.confirmed_points, 1);
  assert.equal(summary.pending, 1);
  assert.equal(summary.dismissed, 1);
  assert.equal(summary.by_admin[0].by_rule.reply_late, 1);
  assert.equal(monthRange("2026-11").from, "2026-10-31T17:00:00.000Z");
  assert.equal(monthRange("2026-11").until, "2026-11-30T17:00:00.000Z");
  assert.equal(monthRange("2026-13"), null);
  assert.equal(
    kpiConfigSchema.safeParse({ ...config, work_start: "23:00" }).success,
    false,
  );
});
