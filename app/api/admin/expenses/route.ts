import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  errorResponse,
  paginateResponse,
  successResponse,
} from "@/lib/api-response";

const normalizeExpensePayload = (body: any) => {
  const title = String(body.title || "").trim();
  const category = String(body.category || "General").trim() || "General";
  const amount = Number(body.amount || 0);
  const expenseDateRaw = String(body.expense_date || "").trim();
  const expenseDate = expenseDateRaw || new Date().toISOString().slice(0, 10);

  if (!title) return { error: "Expense title is required" };
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Expense amount must be a valid non-negative number" };
  }
  if (Number.isNaN(new Date(expenseDate).getTime())) {
    return { error: "Expense date is invalid" };
  }

  return {
    data: {
      title,
      category,
      amount,
      expense_date: expenseDate,
      vendor: String(body.vendor || "").trim() || null,
      payment_method: String(body.payment_method || "").trim() || null,
      notes: String(body.notes || "").trim() || null,
    },
  };
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || "";
    const category = searchParams.get("category") || "";
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("expenses")
      .select("*", { count: "exact" });

    if (keyword) {
      query = query.or(
        `title.ilike.%${keyword}%,category.ilike.%${keyword}%,vendor.ilike.%${keyword}%,payment_method.ilike.%${keyword}%`,
      );
    }

    if (category) query = query.ilike("category", category);
    if (dateFrom) query = query.gte("expense_date", dateFrom);
    if (dateTo) query = query.lte("expense_date", dateTo);

    const { data, error, count } = await query
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return errorResponse(error.message, 400);

    return paginateResponse(
      data || [],
      page,
      limit,
      count || 0,
      "Expenses retrieved",
    );
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const normalized = normalizeExpensePayload(await req.json());
    if (normalized.error) return errorResponse(normalized.error, 400);

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .insert(normalized.data)
      .select()
      .single();

    if (error) return errorResponse(error.message, 400);

    return successResponse(data, "Expense created", 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
