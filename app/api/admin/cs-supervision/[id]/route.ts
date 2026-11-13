import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin-api";
import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";
import { kpiRows } from "@/lib/cs-kpi";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiSession(["root"]);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return errorResponse("ID tidak valid.", 400);
  try {
    const finding = await supabaseAdmin
      .from("cs_kpi_findings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (finding.error) return errorResponse("Gagal memuat bukti.", 500);
    if (!finding.data) return errorResponse("Log tidak ditemukan.", 404);
    const audit = await kpiRows<any>((from, to) =>
      supabaseAdmin
        .from("cs_kpi_audit")
        .select("id, action, actor, before_value, after_value, created_at")
        .eq("table_name", "cs_kpi_findings")
        .eq("row_id", id)
        .order("created_at")
        .order("id")
        .range(from, to),
    );
    return successResponse(
      { finding: finding.data, audit },
      "Bukti dan riwayat peninjauan",
    );
  } catch {
    return errorResponse("Gagal memuat riwayat peninjauan.", 500);
  }
}
