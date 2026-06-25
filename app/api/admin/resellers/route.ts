import { NextRequest } from "next/server";
import { errorResponse, paginateResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAdminApiSession } from "@/lib/admin-api";

const ADMIN_RESELLER_SELECT =
  "id, full_name, email, whatsapp_number, occupation, business_name, business_type, city, country, social_link, estimated_monthly_orders, notes, admin_notes, accepted_terms, status, created_at, updated_at";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminApiSession(["root"]);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || "";
    const status = searchParams.get("status") || "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("reseller_applications")
      .select(ADMIN_RESELLER_SELECT, { count: "exact" });

    if (keyword) {
      query = query.or(
        `full_name.ilike.%${keyword}%,email.ilike.%${keyword}%,whatsapp_number.ilike.%${keyword}%,occupation.ilike.%${keyword}%,business_name.ilike.%${keyword}%,social_link.ilike.%${keyword}%,city.ilike.%${keyword}%`,
      );
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return errorResponse("Failed to load reseller applications", 400);

    return paginateResponse(
      data,
      page,
      limit,
      count || 0,
      "Reseller applications retrieved",
    );
  } catch (err: any) {
    return errorResponse("Failed to load reseller applications", 500);
  }
}
