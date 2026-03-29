export const dynamic = "force-dynamic";

import { errorResponse, successResponse } from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";
import { withAuth } from "@/lib/wrapper-auth-server";
import { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-server";

export const POST = withAuth(async (request: Request, user: User | null) => {
  try {
    // Must be a real (non-anonymous) user
    if (!user || user.is_anonymous) {
      return errorResponse(
        "You must be logged in to use a voucher. Please register or sign in.",
        401,
      );
    }

    const body = await request.json();
    const { code, subtotal } = body;

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return errorResponse("Voucher code is required", 400);
    }

    const numericSubtotal = Number(subtotal);
    if (!Number.isFinite(numericSubtotal) || numericSubtotal <= 0) {
      return errorResponse("Valid subtotal is required", 400);
    }

    // Look up voucher (case-insensitive)
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from("vouchers")
      .select("*")
      .ilike("code", code.trim())
      .maybeSingle();

    if (voucherError) {
      return errorResponse("Failed to validate voucher", 500);
    }

    if (!voucher) {
      return errorResponse("Voucher code not found", 404);
    }

    // Check if active
    if (!voucher.is_active) {
      return errorResponse("This voucher is no longer active", 400);
    }

    // Check date range
    const now = new Date();
    const validFrom = new Date(voucher.valid_from);
    const validUntil = new Date(voucher.valid_until);

    if (now < validFrom) {
      return errorResponse("This voucher is not yet valid", 400);
    }

    if (now > validUntil) {
      return errorResponse("This voucher has expired", 400);
    }

    // Check claim limit
    if (voucher.total_claimed >= voucher.max_claim_qty) {
      return errorResponse(
        "This voucher has reached its maximum usage limit",
        400,
      );
    }

    // Treat discount_nominal as a percentage, then cap the final amount.
    const discountPercentage = Number(voucher.discount_nominal);
    const maxDiscountCap = Number(voucher.max_discount_cap);

    if (
      !Number.isFinite(discountPercentage) ||
      discountPercentage <= 0 ||
      discountPercentage > 100
    ) {
      return errorResponse("This voucher is misconfigured", 400);
    }

    const rawDiscount = Math.round(
      numericSubtotal * (discountPercentage / 100),
    );
    const cappedDiscount =
      Number.isFinite(maxDiscountCap) && maxDiscountCap > 0
        ? Math.min(rawDiscount, maxDiscountCap)
        : rawDiscount;
    const finalDiscount = Math.min(cappedDiscount, numericSubtotal);

    return successResponse(
      {
        voucher_id: voucher.id,
        code: voucher.code,
        discount_nominal: discountPercentage,
        discount_percentage: discountPercentage,
        max_discount_cap: maxDiscountCap,
        discount_amount: finalDiscount,
        valid_until: voucher.valid_until,
      },
      "Voucher is valid",
    );
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
});
