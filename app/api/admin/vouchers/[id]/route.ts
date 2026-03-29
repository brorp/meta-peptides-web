import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("vouchers")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return errorResponse("Voucher not found", 404);

    return successResponse(data, "Voucher retrieved");
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

    if (body.code !== undefined) {
      // Check uniqueness if code changed
      const { data: existing } = await supabaseAdmin
        .from("vouchers")
        .select("id")
        .ilike("code", body.code.trim())
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        return errorResponse("A voucher with this code already exists", 409);
      }
      updateData.code = body.code.trim().toUpperCase();
    }
    if (body.discount_nominal !== undefined)
      updateData.discount_nominal = Number(body.discount_nominal);
    if (body.max_discount_cap !== undefined)
      updateData.max_discount_cap = Number(body.max_discount_cap);
    if (body.valid_from !== undefined) updateData.valid_from = body.valid_from;
    if (body.valid_until !== undefined)
      updateData.valid_until = body.valid_until;
    if (body.max_claim_qty !== undefined)
      updateData.max_claim_qty = Number(body.max_claim_qty);
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("vouchers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error.message, 400);

    return successResponse(data, "Voucher updated");
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

    const { error } = await supabaseAdmin.from("vouchers").delete().eq("id", id);

    if (error) return errorResponse(error.message, 400);

    return successResponse({ id }, "Voucher deleted");
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
