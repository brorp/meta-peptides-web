import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readDiscordBotJson } from "@/lib/discord-bot-auth";
import { isMarketplaceOrderSource, resolveOrderIdentifier } from "@/lib/discord-bot-data";
import { loadBotOrderDetail } from "@/lib/discord-bot-orders";
import {
  normalizeShipmentType,
  syncShipmentExpenseForOrder,
} from "@/lib/shipment-expenses";
import { supabaseAdmin } from "@/lib/supabase-server";

// !updateshipping <invoice>: courier, shipping cost (becomes an expense, not
// part of the invoice total), and tracking number. Shopee/Tokopedia handle
// their own shipping, so the cost is optional there and never an expense
// (same as the panel).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const auth = await readDiscordBotJson(req, { maxRequestsPerMinute: 30 });
    if (auth.response) return auth.response;

    const { identifier } = await params;
    const orderResult = await resolveOrderIdentifier(decodeURIComponent(identifier));
    if (!orderResult.data) return errorResponse(orderResult.error, 404);
    const order = orderResult.data;

    if (order.status === "cancelled" || order.status === "reject") {
      return errorResponse(
        `Invoice ${order.invoice_number || order.id} sudah dibatalkan`,
        400,
      );
    }

    const body = auth.body || {};
    const isMarketplace = isMarketplaceOrderSource(order.order_source);
    const feeMissing =
      body.shipping_fee === undefined || body.shipping_fee === null || body.shipping_fee === "";
    const shipmentType = normalizeShipmentType(body.shipment_type);
    const shippingFee = feeMissing ? 0 : Number(body.shipping_fee);
    const trackingNumber = String(body.tracking_number ?? "").trim();

    if (!shipmentType || shipmentType.length > 100) {
      return errorResponse("shipment_type wajib diisi (contoh JNE REG)", 400);
    }
    if ((feeMissing && !isMarketplace) || !Number.isFinite(shippingFee) || shippingFee < 0) {
      return errorResponse("shipping_fee wajib diisi angka >= 0 (contoh 25000)", 400);
    }
    if (!trackingNumber || trackingNumber.length > 160) {
      return errorResponse("tracking_number (nomor resi) wajib diisi", 400);
    }

    const previous = {
      shipment_type: order.shipment_type,
      shipping_fee: order.shipping_fee,
      tracking_number: order.tracking_number,
    };
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        shipment_type: shipmentType,
        shipping_fee: shippingFee,
        tracking_number: trackingNumber,
      })
      .eq("id", order.id);

    if (updateError) return errorResponse("Gagal mengubah data pengiriman", 400);

    try {
      await syncShipmentExpenseForOrder({
        orderId: order.id,
        orderSource: order.order_source,
        shippingFee,
        shipmentType,
        shippingName: order.shipping_name,
        createdAt: order.created_at,
      });
    } catch (error: any) {
      await supabaseAdmin.from("orders").update(previous).eq("id", order.id);
      return errorResponse(error?.message || "Gagal mencatat ongkir ke expense", 400);
    }

    const detailResult = await loadBotOrderDetail(order.id);
    return successResponse(
      {
        ...detailResult.data,
        previous_tracking_number: previous.tracking_number,
        shipping_expense_recorded: !isMarketplace && shippingFee > 0,
      },
      "Pengiriman diubah",
    );
  } catch {
    return errorResponse("Gagal mengubah data pengiriman", 500);
  }
}
