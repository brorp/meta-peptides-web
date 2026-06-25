import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";

const ADMIN_VOUCHER_SELECT =
  "id, code, discount_nominal, max_discount_cap, valid_from, valid_until, max_claim_qty, total_claimed, is_active, created_at, updated_at";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("vouchers")
      .select(ADMIN_VOUCHER_SELECT)
      .eq("id", id)
      .single();

    if (error || !data) return errorResponse("Voucher not found", 404);

    return successResponse(data, "Voucher retrieved");
  } catch (err: any) {
    return errorResponse("Failed to load voucher", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, any> = {};

    if (body.code !== undefined) {
      if (typeof body.code !== "string" || body.code.trim().length === 0) {
        return errorResponse("Voucher code is required", 400);
      }

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
    if (body.discount_nominal !== undefined) {
      const discountPercentage = Number(body.discount_nominal);

      if (
        !Number.isFinite(discountPercentage) ||
        discountPercentage <= 0 ||
        discountPercentage > 100
      ) {
        return errorResponse(
          "Discount percentage must be between 1 and 100",
          400,
        );
      }

      updateData.discount_nominal = discountPercentage;
    }
    if (body.max_discount_cap !== undefined) {
      const maxDiscountCap = Number(body.max_discount_cap);

      if (!Number.isFinite(maxDiscountCap) || maxDiscountCap <= 0) {
        return errorResponse("Max discount cap must be greater than 0", 400);
      }

      updateData.max_discount_cap = maxDiscountCap;
    }
    if (body.valid_from !== undefined) updateData.valid_from = body.valid_from;
    if (body.valid_until !== undefined)
      updateData.valid_until = body.valid_until;
    if (body.max_claim_qty !== undefined) {
      const maxClaimQty = Number(body.max_claim_qty);

      if (!Number.isFinite(maxClaimQty) || maxClaimQty <= 0) {
        return errorResponse("Max claim quantity must be greater than 0", 400);
      }

      updateData.max_claim_qty = maxClaimQty;
    }
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const nextValidFrom = updateData.valid_from ?? body.valid_from;
    const nextValidUntil = updateData.valid_until ?? body.valid_until;
    if (
      nextValidFrom !== undefined &&
      nextValidUntil !== undefined &&
      new Date(nextValidUntil) <= new Date(nextValidFrom)
    ) {
      return errorResponse("Valid until must be after valid from", 400);
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("vouchers")
      .update(updateData)
      .eq("id", id)
      .select(ADMIN_VOUCHER_SELECT)
      .single();

    if (error) return errorResponse("Failed to update voucher", 400);

    return successResponse(data, "Voucher updated");
  } catch (err: any) {
    return errorResponse("Failed to update voucher", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const { id } = await params;

    const { error } = await supabaseAdmin.from("vouchers").delete().eq("id", id);

    if (error) return errorResponse("Failed to delete voucher", 400);

    return successResponse({ id }, "Voucher deleted");
  } catch (err: any) {
    return errorResponse("Failed to delete voucher", 500);
  }
}
