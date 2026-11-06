import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api";
import { errorResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  isMissingCustomerUsernameColumn,
  isMissingTrackingNumberColumn,
} from "@/lib/order-schema-compat";
import { parseOrderReportRange, prepareOrderReportRows, type ReportOrder } from "@/lib/order-report";
import { createOrderReportWorkbook } from "@/lib/order-report-workbook";

export const runtime = "nodejs";

const BATCH_SIZE = 500;
const ORDER_SELECT = "id, invoice_number, manual_reference, created_at, order_source, status, is_paid, paid_at, subtotal, total_price, voucher_code, voucher_discount_amount, marketplace_fee, shipping_fee, shipping_name, shipping_phone, shipping_email, shipping_address, shipping_regional, shipping_zip, shipment_type, tracking_number, customer_username, note, order_items(product_id, quantity, price_at_purchase, products(name, label, volume)), payments(payment_type, transaction_code)";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const params = new URL(req.url).searchParams;
    const range = parseOrderReportRange(params.get("date_from"), params.get("date_to"));
    if (!range) {
      return errorResponse("Pilih rentang tanggal yang valid (YYYY-MM-DD); tanggal awal harus sebelum atau sama dengan tanggal akhir.", 400);
    }

    const orders: ReportOrder[] = [];
    let select = ORDER_SELECT;
    for (let offset = 0; ; offset += BATCH_SIZE) {
      const loadBatch = () => supabaseAdmin
        .from("orders")
        .select(select)
        .gte("created_at", range.from)
        .lt("created_at", range.until)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);
      let result = await loadBatch();
      // Older installations may not have these optional customer/shipping fields.
      for (let retry = 0; result.error && retry < 2; retry++) {
        if (isMissingCustomerUsernameColumn(result.error) && select.includes("customer_username, ")) {
          select = select.replace("customer_username, ", "");
        } else if (isMissingTrackingNumberColumn(result.error) && select.includes("tracking_number, ")) {
          select = select.replace("tracking_number, ", "");
        } else {
          break;
        }
        result = await loadBatch();
      }
      if (result.error) {
        return errorResponse("Gagal memuat data laporan order.", 500);
      }
      const batch = (result.data || []) as unknown as ReportOrder[];
      orders.push(...batch);
      if (batch.length < BATCH_SIZE) break;
    }

    const workbook = createOrderReportWorkbook(prepareOrderReportRows(orders), range);
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="meta-peptides-orders-${range.dateFrom}-${range.dateTo}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return errorResponse("Gagal membuat laporan order. Silakan coba lagi.", 500);
  }
}
