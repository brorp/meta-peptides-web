import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { authenticateDiscordBotRequest } from "@/lib/discord-bot-auth";
import { EXPENSE_PAID_BY, parseDateRange } from "@/lib/discord-bot-data";
import { fetchAllRows } from "@/lib/discord-bot-orders";
import { supabaseAdmin } from "@/lib/supabase-server";

// !reimbursement <from> <to> (directors channel only): expenses marked
// is_reimburse = true, with totals per person who paid.
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateDiscordBotRequest(req, "", {
      directorsOnly: true,
      maxRequestsPerMinute: 30,
    });
    if (auth.response) return auth.response;

    const range = parseDateRange(req, 366);
    if (range.error) return errorResponse(range.error, 400);

    const expenses = await fetchAllRows<any>((from, to) =>
      supabaseAdmin
        .from("expenses")
        .select("id, title, category, amount, expense_date, vendor, payment_method, notes, paid_by")
        .eq("is_reimburse", true)
        .gte("expense_date", range.dateFrom)
        .lte("expense_date", range.dateTo)
        .order("expense_date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    );

    const totals = Object.fromEntries(EXPENSE_PAID_BY.map((paidBy) => [paidBy, 0])) as Record<string, number>;
    let unassigned = 0;
    for (const expense of expenses) {
      const amount = Number(expense.amount || 0);
      if (expense.paid_by && expense.paid_by in totals) {
        totals[expense.paid_by] += amount;
      } else {
        unassigned += amount;
      }
    }

    return successResponse(
      {
        date_from: range.dateFrom,
        date_to: range.dateTo,
        total: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        totals_by_paid_by: totals,
        unassigned_total: unassigned,
        items: expenses,
      },
      "Data reimbursement",
    );
  } catch {
    return errorResponse("Gagal memuat data reimbursement", 500);
  }
}
