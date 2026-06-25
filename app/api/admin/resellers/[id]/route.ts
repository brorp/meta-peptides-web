import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAdminApiSession } from "@/lib/admin-api";

const RESELLER_STATUSES = ["new", "contacted", "approved", "rejected"];
const ADMIN_RESELLER_SELECT =
  "id, full_name, email, whatsapp_number, occupation, business_name, business_type, city, country, social_link, estimated_monthly_orders, notes, admin_notes, accepted_terms, status, created_at, updated_at";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApiSession(["root"]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("reseller_applications")
      .select(ADMIN_RESELLER_SELECT)
      .eq("id", id)
      .single();

    if (error || !data) return errorResponse("Reseller application not found", 404);

    return successResponse(data, "Reseller application retrieved");
  } catch (err: any) {
    return errorResponse("Failed to load reseller application", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApiSession(["root"]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.status !== undefined) {
      if (!RESELLER_STATUSES.includes(body.status)) {
        return errorResponse("Invalid reseller status", 400);
      }
      updateData.status = body.status;
    }

    if (body.admin_notes !== undefined) {
      const adminNotes = String(body.admin_notes || "").trim();
      updateData.admin_notes = adminNotes || null;
    }

    if (!Object.keys(updateData).length) {
      return errorResponse("No reseller changes were provided", 400);
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("reseller_applications")
      .update(updateData)
      .eq("id", id)
      .select(ADMIN_RESELLER_SELECT)
      .single();

    if (error) return errorResponse("Failed to update reseller application", 400);

    return successResponse(data, "Reseller application updated");
  } catch (err: any) {
    return errorResponse("Failed to update reseller application", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApiSession(["root"]);
    if (auth.response) return auth.response;

    const { id } = await params;
    const { error } = await supabaseAdmin
      .from("reseller_applications")
      .delete()
      .eq("id", id);

    if (error) return errorResponse("Failed to delete reseller application", 400);

    return successResponse({ id }, "Reseller application deleted");
  } catch (err: any) {
    return errorResponse("Failed to delete reseller application", 500);
  }
}
