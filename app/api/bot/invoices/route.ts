import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readDiscordBotJson } from "@/lib/discord-bot-auth";
import {
  normalizePaymentType,
  resolveLeadIdentifier,
  translateDatabaseError,
} from "@/lib/discord-bot-data";
import { loadBotOrderDetail } from "@/lib/discord-bot-orders";
import {
  ProductMatchError,
  loadBotProducts,
  resolveProductQuery,
} from "@/lib/discord-bot-products";
import { supabaseAdmin } from "@/lib/supabase-server";

type InvoiceItemInput = {
  query?: unknown;
  quantity?: unknown;
  price?: unknown;
};

// !invoice: same result as the manual order form in the panel, plus it marks
// the lead as a customer and snapshots each product's usage life.
export async function POST(req: NextRequest) {
  try {
    const auth = await readDiscordBotJson(req, { maxRequestsPerMinute: 20 });
    if (auth.response) return auth.response;

    // A retried Discord message returns the invoice it already created.
    const { data: replay } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("discord_message_id", auth.context!.messageId)
      .maybeSingle();
    if (replay) {
      const replayOrder = await loadBotOrderDetail(replay.id);
      return successResponse({ ...replayOrder.data, duplicate: true }, "Invoice sudah dibuat");
    }

    const body = auth.body || {};
    const leadIdentifier = String(body.lead ?? "").trim();
    const shippingAddress = String(body.address ?? "").trim();
    const shippingRegional = String(body.city ?? "").trim();
    const shippingZip = String(body.zip ?? "").trim();
    const note = String(body.notes ?? "").trim();
    const discountAmount = body.discount === undefined || body.discount === null
      ? 0
      : Number(body.discount);
    const paymentType = normalizePaymentType(body.payment_type ?? "Bank Transfer");
    const rawItems = Array.isArray(body.items) ? (body.items as InvoiceItemInput[]) : [];

    if (!leadIdentifier) return errorResponse("lead wajib diisi (nomor WA lead)", 400);
    if (!shippingAddress || shippingAddress.length > 1000) {
      return errorResponse("address wajib diisi (maksimal 1000 karakter)", 400);
    }
    if (!shippingRegional || shippingRegional.length > 200) {
      return errorResponse("city wajib diisi (kota/kabupaten, provinsi)", 400);
    }
    if (shippingZip.length > 20) return errorResponse("zip terlalu panjang", 400);
    if (note.length > 4000) return errorResponse("notes maksimal 4000 karakter", 400);
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      return errorResponse("discount harus angka >= 0", 400);
    }
    if (!paymentType) {
      return errorResponse("payment_type harus Bank Transfer, QRIS, Shopee, atau Tokopedia", 400);
    }
    if (!rawItems.length || rawItems.length > 25) {
      return errorResponse("Invoice wajib berisi 1-25 baris item", 400);
    }

    const parsedItems = rawItems.map((item, index) => ({
      line: index + 1,
      query: String(item?.query ?? "").trim(),
      quantity: Number(item?.quantity),
      price:
        item?.price === undefined || item?.price === null || item?.price === ""
          ? null
          : Number(item.price),
    }));
    for (const item of parsedItems) {
      if (!item.query) return errorResponse(`Item ${item.line}: nama produk kosong`, 400);
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
        return errorResponse(`Item ${item.line} (${item.query}): qty harus angka 1-100`, 400);
      }
      if (item.price !== null && (!Number.isFinite(item.price) || item.price < 0)) {
        return errorResponse(`Item ${item.line} (${item.query}): harga custom tidak valid`, 400);
      }
    }

    const leadResult = await resolveLeadIdentifier(leadIdentifier);
    if (!leadResult.data) return errorResponse(leadResult.error, 404);

    const products = await loadBotProducts();
    const resolvedItems = [];
    for (const item of parsedItems) {
      try {
        const product = await resolveProductQuery(item.query, { products });
        resolvedItems.push({ ...item, product });
      } catch (error) {
        if (error instanceof ProductMatchError) {
          return errorResponse(`Item ${item.line}: ${error.message}`, 400, {
            candidates: error.candidates,
          });
        }
        throw error;
      }
    }

    // Lines for the same product and price are merged into one order item.
    const merged = new Map<string, { product_id: string; quantity: number; price: number | null }>();
    for (const item of resolvedItems) {
      const key = `${item.product.id}:${item.price ?? "default"}`;
      const current = merged.get(key);
      merged.set(key, {
        product_id: item.product.id,
        quantity: (current?.quantity || 0) + item.quantity,
        price: item.price,
      });
    }

    const { data: result, error: createError } = await supabaseAdmin.rpc(
      "create_discord_invoice",
      {
        p_lead_id: leadResult.data.id,
        p_shipping_address: shippingAddress,
        p_shipping_regional: shippingRegional,
        p_shipping_zip: shippingZip || null,
        p_items: Array.from(merged.values()),
        p_discount_amount: discountAmount,
        p_payment_type: paymentType,
        p_note: note || null,
        p_discord_message_id: auth.context!.messageId,
      },
    );

    if (createError || !result?.order_id) {
      return errorResponse(
        translateDatabaseError(createError?.message, "Gagal membuat invoice"),
        400,
      );
    }

    const orderResult = await loadBotOrderDetail(result.order_id);
    if (!orderResult.data) {
      return errorResponse("Invoice dibuat tapi gagal dimuat. Cek di panel.", 500);
    }

    return successResponse(
      { ...orderResult.data, duplicate: result.duplicate === true },
      result.duplicate ? "Invoice sudah dibuat" : "Invoice dibuat",
      result.duplicate ? 200 : 201,
    );
  } catch (error) {
    if (error instanceof ProductMatchError) {
      return errorResponse(error.message, 400, { candidates: error.candidates });
    }
    return errorResponse("Gagal membuat invoice", 500);
  }
}
