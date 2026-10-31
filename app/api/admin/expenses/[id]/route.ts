import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";

const ADMIN_EXPENSE_SELECT =
  "id, title, category, amount, expense_date, vendor, payment_method, notes, is_reimburse, paid_by, created_at, updated_at";

const normalizeExpenseUpdate = (body: any) => {
  const updateData: Record<string, any> = {};

  if (body.title !== undefined) {
    const title = String(body.title || "").trim();
    if (!title) return { error: "Expense title is required" };
    updateData.title = title;
  }

  if (body.category !== undefined) {
    updateData.category = String(body.category || "General").trim() || "General";
  }

  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "Expense amount must be a valid non-negative number" };
    }
    updateData.amount = amount;
  }

  if (body.expense_date !== undefined) {
    const expenseDate = String(body.expense_date || "").trim();
    if (!expenseDate || Number.isNaN(new Date(expenseDate).getTime())) {
      return { error: "Expense date is invalid" };
    }
    updateData.expense_date = expenseDate;
  }

  for (const nullableField of ["vendor", "payment_method", "notes"]) {
    if (body[nullableField] !== undefined) {
      updateData[nullableField] =
        String(body[nullableField] || "").trim() || null;
    }
  }

  if (body.is_reimburse !== undefined) {
    if (typeof body.is_reimburse !== "boolean") {
      return { error: "Is reimburse must be true or false" };
    }
    updateData.is_reimburse = body.is_reimburse;
  }

  if (body.paid_by !== undefined) {
    const paidBy = String(body.paid_by || "").trim().toLowerCase();
    if (paidBy && !["kas", "rudi", "rp"].includes(paidBy)) {
      return { error: "Paid by must be kas, rudi, or rp" };
    }
    updateData.paid_by = paidBy || null;
  }

  if (Object.keys(updateData).length) {
    updateData.updated_at = new Date().toISOString();
  }

  return { data: updateData };
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApiSession(["root"]);
    if (auth.response) return auth.response;

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .select(ADMIN_EXPENSE_SELECT)
      .eq("id", id)
      .single();

    if (error || !data) return errorResponse("Expense not found", 404);

    return successResponse(data, "Expense retrieved");
  } catch (err: any) {
    return errorResponse("Failed to load expense", 500);
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
    const normalized = normalizeExpenseUpdate(await req.json());

    if (normalized.error) return errorResponse(normalized.error, 400);
    if (!normalized.data || !Object.keys(normalized.data).length) {
      return errorResponse("No expense changes were provided", 400);
    }

    if (
      normalized.data.is_reimburse !== undefined ||
      normalized.data.paid_by !== undefined
    ) {
      const { data: current, error: currentError } = await supabaseAdmin
        .from("expenses")
        .select("is_reimburse, paid_by")
        .eq("id", id)
        .single();
      if (currentError || !current) return errorResponse("Expense not found", 404);

      const isReimburse = normalized.data.is_reimburse ?? current.is_reimburse;
      const paidBy = normalized.data.paid_by ?? current.paid_by;
      if (isReimburse && (!paidBy || paidBy === "kas")) {
        return errorResponse("Reimbursement requires paid by Rudi or RP", 400);
      }
    }

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .update(normalized.data)
      .eq("id", id)
      .select(ADMIN_EXPENSE_SELECT)
      .single();

    if (error) return errorResponse("Failed to update expense", 400);

    return successResponse(data, "Expense updated");
  } catch (err: any) {
    return errorResponse("Failed to update expense", 500);
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

    const { error } = await supabaseAdmin.from("expenses").delete().eq("id", id);

    if (error) return errorResponse("Failed to delete expense", 400);

    return successResponse({ id }, "Expense deleted");
  } catch (err: any) {
    return errorResponse("Failed to delete expense", 500);
  }
}
