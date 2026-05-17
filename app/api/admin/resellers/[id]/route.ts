import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";

const RESELLER_STATUSES = ["new", "contacted", "approved", "rejected"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("reseller_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return errorResponse("Reseller application not found", 404);

    return successResponse(data, "Reseller application retrieved");
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
      .select()
      .single();

    if (error) return errorResponse(error.message, 400);

    return successResponse(data, "Reseller application updated");
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin
      .from("reseller_applications")
      .delete()
      .eq("id", id);

    if (error) return errorResponse(error.message, 400);

    return successResponse({ id }, "Reseller application deleted");
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
