import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin-api";
import { errorResponse, successResponse } from "@/lib/api-response";
import { KPI_RULES, RULE_KEYS, kpiConfigSchema } from "@/lib/cs-kpi-core";
import {
  KpiError,
  loadKpiDashboard,
  loadKpiState,
  runKpiScan,
} from "@/lib/cs-kpi";
import { supabaseAdmin } from "@/lib/supabase-server";

export const maxDuration = 60;
const actor = z.string().trim().min(1).max(100);
const uuid = z.string().uuid();
const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("scan") }).strict(),
  z
    .object({ action: z.literal("settings"), actor, config: kpiConfigSchema })
    .strict(),
  z
    .object({
      action: z.literal("admin"),
      actor,
      id: uuid.nullable(),
      name: z.string().trim().min(1).max(100),
      discord_user_id: z.string().regex(/^(?:\d{6,24})?$/),
      active: z.boolean(),
      report_required: z.boolean(),
      work_days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    })
    .strict(),
  z
    .object({
      action: z.literal("review"),
      reviewer: actor,
      id: uuid,
      status: z.enum(["pending", "confirmed", "dismissed"]),
      admin_id: uuid.nullable(),
      note: z.string().trim().min(1).max(1000),
      version: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      action: z.literal("manual"),
      actor,
      rule: z.enum(RULE_KEYS),
      admin_id: uuid.nullable(),
      occurred_at: z.string().datetime({ offset: true }),
      reason: z.string().trim().min(10).max(4000),
      evidence_url: z.union([
        z.literal(""),
        z
          .string()
          .url()
          .max(1000)
          .refine((url) => url.startsWith("https://")),
      ]),
    })
    .strict(),
]);
function failure(error: unknown) {
  return errorResponse(
    error instanceof KpiError ? error.message : "Gagal memproses supervisi CS.",
    error instanceof KpiError ? error.status : 500,
  );
}
export async function GET(req: NextRequest) {
  const auth = await requireAdminApiSession(["root"]);
  if (auth.response) return auth.response;
  try {
    return successResponse(
      await loadKpiDashboard(new URL(req.url).searchParams),
      "Supervisi CS",
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiSession(["root"]);
  if (auth.response) return auth.response;
  try {
    if (
      req.headers.get("origin") &&
      req.headers.get("origin") !== new URL(req.url).origin
    )
      return errorResponse("Origin tidak diizinkan.", 403);
    const text = await req.text();
    if (Buffer.byteLength(text) > 16000)
      return errorResponse("Payload terlalu besar.", 413);
    const parsed = inputSchema.safeParse(JSON.parse(text));
    if (!parsed.success)
      return errorResponse(
        "Isian supervisi tidak valid. Periksa PIC, catatan, dan tanggal.",
        400,
      );
    const body = parsed.data;
    if (body.action === "scan")
      return successResponse(await runKpiScan(), "Pemeriksaan selesai");
    const state = await loadKpiState();
    if (body.action === "settings") {
      if (
        body.config.enabled &&
        !state.admins.some(
          (admin) => admin.id === body.config.default_admin_id && admin.active,
        )
      )
        return errorResponse("PIC harus admin aktif.", 400);
      const { error } = await supabaseAdmin.rpc("cs_kpi_save_settings", {
        p_config: body.config,
        p_actor: body.actor,
      });
      if (error) throw new KpiError("Gagal menyimpan pengaturan supervisi.");
    } else if (body.action === "admin") {
      if (
        !body.active &&
        state.config.enabled &&
        body.id === state.config.default_admin_id
      )
        return errorResponse(
          "Ganti PIC aktif sebelum menonaktifkan admin ini.",
          400,
        );
      const { error } = await supabaseAdmin.rpc("cs_kpi_upsert_admin", {
        p_id: body.id,
        p_name: body.name,
        p_discord_user_id: body.discord_user_id,
        p_active: body.active,
        p_report_required: body.report_required,
        p_work_days: body.work_days,
        p_actor: body.actor,
      });
      if (error)
        throw new KpiError(
          "Gagal menyimpan data admin. Periksa ID yang dipakai.",
        );
    } else if (body.action === "review") {
      if (body.status === "confirmed" && !body.admin_id)
        return errorResponse("Pilih PIC sebelum mengesahkan temuan.", 400);
      if (
        body.admin_id &&
        !state.admins.some((admin) => admin.id === body.admin_id)
      )
        return errorResponse("Admin tidak ditemukan.", 400);
      const { error } = await supabaseAdmin.rpc("cs_kpi_review_finding", {
        p_id: body.id,
        p_status: body.status,
        p_admin_id: body.admin_id,
        p_note: body.note,
        p_reviewer: body.reviewer,
        p_version: body.version,
      });
      if (error) {
        if (String(error.message).includes("CS_KPI_CONFLICT"))
          return errorResponse(
            "Log berubah saat Anda meninjau. Muat ulang sebelum menyimpan.",
            409,
          );
        if (String(error.message).includes("CS_KPI_NOT_FOUND"))
          return errorResponse("Log tidak ditemukan.", 404);
        throw new KpiError("Gagal menyimpan peninjauan.");
      }
    } else {
      if (new Date(body.occurred_at).getTime() > Date.now())
        return errorResponse("Waktu kejadian tidak boleh di masa depan.", 400);
      if (
        body.admin_id &&
        !state.admins.some((admin) => admin.id === body.admin_id)
      )
        return errorResponse("Admin tidak ditemukan.", 400);
      const { error } = await supabaseAdmin.rpc("cs_kpi_record_finding", {
        p_finding: {
          incident_key: `manual:${randomUUID()}`,
          rule: body.rule,
          admin_id: body.admin_id,
          occurred_at: body.occurred_at,
          source: "manual",
          evidence: {
            reason: body.reason,
            evidence_url: body.evidence_url || null,
            recorded_by: `root: ${body.actor}`,
            points: KPI_RULES[body.rule].points,
          },
        },
      });
      if (error) throw new KpiError("Gagal menyimpan temuan manual.");
    }
    return successResponse(null, "Tersimpan");
  } catch (error) {
    if (error instanceof SyntaxError)
      return errorResponse("JSON tidak valid.", 400);
    return failure(error);
  }
}
