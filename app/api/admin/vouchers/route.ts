import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  paginateResponse,
  errorResponse,
  successResponse,
} from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("vouchers")
      .select("*", { count: "exact" });

    if (keyword) {
      query = query.ilike("code", `%${keyword}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return errorResponse(error.message, 400);

    return paginateResponse(
      data,
      page,
      limit,
      count || 0,
      "Vouchers retrieved",
    );
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      code,
      discount_nominal,
      max_discount_cap,
      valid_from,
      valid_until,
      max_claim_qty,
      is_active,
    } = body;

    const discountPercentage = Number(discount_nominal);
    const maxDiscountCap = Number(max_discount_cap);
    const maxClaimQty = Number(max_claim_qty);

    if (!code || code.trim().length === 0) {
      return errorResponse("Voucher code is required", 400);
    }
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
    if (!Number.isFinite(maxDiscountCap) || maxDiscountCap <= 0) {
      return errorResponse("Max discount cap must be greater than 0", 400);
    }
    if (!valid_from || !valid_until) {
      return errorResponse("Valid from and valid until are required", 400);
    }
    if (new Date(valid_until) <= new Date(valid_from)) {
      return errorResponse("Valid until must be after valid from", 400);
    }
    if (!Number.isFinite(maxClaimQty) || maxClaimQty <= 0) {
      return errorResponse("Max claim quantity must be greater than 0", 400);
    }

    // Check for duplicates (case-insensitive)
    const { data: existing } = await supabaseAdmin
      .from("vouchers")
      .select("id")
      .ilike("code", code.trim())
      .maybeSingle();

    if (existing) {
      return errorResponse("A voucher with this code already exists", 409);
    }

    const { data, error } = await supabaseAdmin
      .from("vouchers")
      .insert({
        code: code.trim().toUpperCase(),
        discount_nominal: discountPercentage,
        max_discount_cap: maxDiscountCap,
        valid_from,
        valid_until,
        max_claim_qty: maxClaimQty,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message, 400);

    return successResponse(data, "Voucher created", 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
