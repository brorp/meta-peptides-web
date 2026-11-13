import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin-api";
import { errorResponse, successResponse } from "@/lib/api-response";
import { dateWib, nextDate, validDate } from "@/lib/cs-kpi-core";
import { KpiError, loadKpiState } from "@/lib/cs-kpi";
import { supabaseAdmin } from "@/lib/supabase-server";

const reportInput = z
  .object({
    report_date: z.string().refine(validDate),
    summary: z.string().trim().min(20).max(4000),
    follow_up: z.string().trim().max(2000),
    blockers: z.string().trim().max(2000),
  })
  .strict();
export async function GET(req: NextRequest) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  try {
    const state = await loadKpiState();
    const admin = state.admins.find(
      (person) => person.id === state.config.default_admin_id && person.active,
    );
    if (!admin) return errorResponse("PIC laporan harian belum diatur.", 503);
    const date = new URL(req.url).searchParams.get("date") || dateWib();
    if (!validDate(date) || date > dateWib() || date < nextDate(dateWib(), -90))
      return errorResponse("Tanggal laporan tidak valid.", 400);
    const report = await supabaseAdmin
      .from("cs_kpi_daily_reports")
      .select("id, report_date, sent_at, summary, follow_up, blockers")
      .eq("admin_id", admin.id)
      .eq("report_date", date)
      .eq("source", "panel")
      .maybeSingle();
    if (report.error) return errorResponse("Gagal memuat laporan harian.", 500);
    // Staff receive only their own report, never findings, scores, audits,
    // supervisor settings or reports attributed to another person.
    return successResponse(
      {
        admin_name: admin.name,
        report: report.data,
        today: dateWib(),
        deadline: state.config.report_deadline,
      },
      "Laporan harian CS",
    );
  } catch (error) {
    return errorResponse(
      "Daily Report belum siap. Hubungi direksi.",
      error instanceof KpiError ? error.status : 500,
    );
  }
}
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  try {
    if (
      req.headers.get("origin") &&
      req.headers.get("origin") !== new URL(req.url).origin
    )
      return errorResponse("Origin tidak diizinkan.", 403);
    const text = await req.text();
    if (Buffer.byteLength(text) > 12000)
      return errorResponse("Laporan terlalu besar.", 413);
    const parsed = reportInput.safeParse(JSON.parse(text));
    if (!parsed.success)
      return errorResponse(
        "Isi ringkasan kerja minimal 20 karakter dan periksa panjang catatan.",
        400,
      );
    const body = parsed.data;
    const state = await loadKpiState();
    const admin = state.admins.find(
      (person) => person.id === state.config.default_admin_id && person.active,
    );
    if (!admin) return errorResponse("PIC laporan harian belum diatur.", 503);
    const now = new Date().toISOString();
    if (
      body.report_date > dateWib(now) ||
      body.report_date < nextDate(dateWib(now), -90) ||
      body.report_date < dateWib(admin.created_at)
    )
      return errorResponse(
        "Tanggal laporan di luar periode yang diizinkan.",
        400,
      );
    const { data, error } = await supabaseAdmin
      .from("cs_kpi_daily_reports")
      .insert({
        ...body,
        admin_id: admin.id,
        sent_at: now,
        source: "panel",
        source_key: `panel:${admin.id}:${body.report_date}`,
        recorded_by: auth.role,
      })
      .select("id, report_date, sent_at")
      .single();
    if (error?.code === "23505")
      return errorResponse(
        "Laporan tanggal ini sudah dikirim. Catatan tambahan dapat disampaikan ke direksi.",
        409,
      );
    if (error) return errorResponse("Gagal menyimpan laporan harian.", 500);
    return successResponse(data, "Laporan harian terkirim", 201);
  } catch (error) {
    return errorResponse(
      "Gagal menyimpan laporan harian. Periksa isian atau hubungi direksi.",
      error instanceof KpiError
        ? error.status
        : error instanceof SyntaxError
          ? 400
          : 500,
    );
  }
}
