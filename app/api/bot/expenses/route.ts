import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readDiscordBotJson } from "@/lib/discord-bot-auth";
import {
  EXPENSE_PAID_BY,
  getJakartaDate,
  normalizeEnumValue,
  parseDateOnly,
} from "@/lib/discord-bot-data";
import { supabaseAdmin } from "@/lib/supabase-server";

const EXPENSE_SELECT =
  "id, title, category, amount, expense_date, vendor, payment_method, notes, is_reimburse, paid_by, created_at";

// !addexpense (directors channel only). Same fields as the panel's expense
// form plus is_reimburse and paid_by.
export async function POST(req: NextRequest) {
  try {
    const auth = await readDiscordBotJson(req, {
      directorsOnly: true,
      maxRequestsPerMinute: 20,
    });
    if (auth.response) return auth.response;

    const { data: replay } = await supabaseAdmin
      .from("expenses")
      .select(EXPENSE_SELECT)
      .eq("discord_message_id", auth.context!.messageId)
      .maybeSingle();
    if (replay) return successResponse(replay, "Expense sudah dibuat");

    const body = auth.body || {};
    const title = String(body.title ?? "").trim();
    const category = String(body.category ?? "").trim() || "Operations";
    const amount = Number(body.amount);
    const expenseDate = body.expense_date ? parseDateOnly(body.expense_date) : getJakartaDate();
    const paidBy = normalizeEnumValue(body.paid_by);
    const notes = String(body.notes ?? "").trim();
    const vendor = String(body.vendor ?? "").trim();
    const paymentMethod = String(body.payment_method ?? "").trim();

    if (!title || title.length > 200) {
      return errorResponse("title wajib diisi (maksimal 200 karakter)", 400);
    }
    if (category.length > 100) return errorResponse("category maksimal 100 karakter", 400);
    if (body.amount === undefined || !Number.isFinite(amount) || amount <= 0) {
      return errorResponse("amount wajib diisi nominal > 0 (contoh 350000)", 400);
    }
    if (!expenseDate) return errorResponse("expense_date wajib format YYYY-MM-DD", 400);
    if (!EXPENSE_PAID_BY.includes(paidBy as (typeof EXPENSE_PAID_BY)[number])) {
      return errorResponse(`paid_by wajib salah satu dari: ${EXPENSE_PAID_BY.join(", ")}`, 400);
    }
    if (typeof body.is_reimburse !== "boolean") {
      return errorResponse("is_reimburse wajib diisi true atau false", 400);
    }
    if (body.is_reimburse && paidBy === "kas") {
      return errorResponse(
        "Expense yang dibayar dari kas tidak perlu reimburse. Isi is_reimburse: false, atau ganti paid_by.",
        400,
      );
    }
    if (notes.length > 4000) return errorResponse("notes maksimal 4000 karakter", 400);

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .insert({
        title,
        category,
        amount,
        expense_date: expenseDate,
        vendor: vendor || null,
        payment_method: paymentMethod || null,
        notes: notes || null,
        is_reimburse: body.is_reimburse,
        paid_by: paidBy,
        discord_message_id: auth.context!.messageId,
      })
      .select(EXPENSE_SELECT)
      .single();

    if (error) return errorResponse("Gagal menyimpan expense", 400);
    return successResponse(data, "Expense dibuat", 201);
  } catch {
    return errorResponse("Gagal menyimpan expense", 500);
  }
}
