import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readDiscordBotJson } from "@/lib/discord-bot-auth";
import {
  isMarketplaceOrderSource,
  marketplaceLabel,
  normalizeOrderType,
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

const isBlank = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === "";

// !invoice: same result as the manual order form in the panel (WhatsApp,
// Shopee or Tokopedia order), plus it marks the lead as a customer and
// snapshots each product's usage life. A Shopee/Tokopedia buyer does not have
// to be a lead (marketplaces hide the phone number): then only the buyer's
// name is saved, like the panel's Shopee label import.
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
    const buyerName = String(body.name ?? "").trim();
    const shippingAddress = String(body.address ?? "").trim();
    const shippingRegional = String(body.city ?? "").trim();
    const shippingZip = String(body.zip ?? "").trim();
    const note = String(body.notes ?? "").trim();
    const discountAmount = body.discount === undefined || body.discount === null
      ? 0
      : Number(body.discount);
    const requestedPayment = isBlank(body.payment_type)
      ? null
      : normalizePaymentType(body.payment_type);
    const marketplaceFee = isBlank(body.marketplace_fee) ? 0 : Number(body.marketplace_fee);
    const marketplaceOrderNo = String(body.marketplace_order_no ?? "").trim();
    const rawItems = Array.isArray(body.items) ? (body.items as InvoiceItemInput[]) : [];

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
    if (!isBlank(body.payment_type) && !requestedPayment) {
      return errorResponse("payment_type harus Bank Transfer atau QRIS (order Shopee/Tokopedia otomatis)", 400);
    }

    // Same choices as "Order Source" in the panel. Without order_type, paying
    // through Shopee/Tokopedia means it is a Shopee/Tokopedia order.
    let orderSource: string | null = "manual_whatsapp";
    if (!isBlank(body.order_type)) {
      orderSource = normalizeOrderType(body.order_type);
      if (!orderSource) {
        return errorResponse("order_type harus whatsapp, shopee, atau tokopedia", 400);
      }
    } else if (requestedPayment === "Shopee" || requestedPayment === "Tokopedia") {
      orderSource = requestedPayment.toLowerCase();
    }
    const isMarketplace = isMarketplaceOrderSource(orderSource);
    const label = marketplaceLabel(orderSource);

    let paymentType = requestedPayment || "Bank Transfer";
    if (isMarketplace) {
      if (requestedPayment && requestedPayment !== label) {
        return errorResponse(
          `Order ${label} dibayar lewat ${label}. Hapus baris payment_type (otomatis ${label}).`,
          400,
        );
      }
      paymentType = label;
    } else if (requestedPayment === "Shopee" || requestedPayment === "Tokopedia") {
      return errorResponse(
        `payment_type ${requestedPayment} hanya untuk order ${requestedPayment}. Tulis order_type: ${requestedPayment.toLowerCase()} kalau ini order ${requestedPayment}.`,
        400,
      );
    }

    // Like the panel: the marketplace fee is only for Shopee/Tokopedia and
    // comes off the total; a manual discount is only for WhatsApp orders.
    if (!Number.isFinite(marketplaceFee) || marketplaceFee < 0) {
      return errorResponse("marketplace_fee harus angka >= 0 (contoh 175000)", 400);
    }
    if (!isMarketplace && marketplaceFee > 0) {
      return errorResponse("marketplace_fee hanya untuk order_type shopee atau tokopedia", 400);
    }
    if (isMarketplace && discountAmount > 0) {
      return errorResponse(
        `discount hanya untuk order WhatsApp. Untuk order ${label}, tulis harga jual di item (harga custom) dan potongan platform di marketplace_fee.`,
        400,
      );
    }
    if (marketplaceOrderNo && !isMarketplace) {
      return errorResponse("marketplace_order_no hanya untuk order_type shopee atau tokopedia", 400);
    }
    if (marketplaceOrderNo.length > 100) {
      return errorResponse("marketplace_order_no maksimal 100 karakter", 400);
    }

    // WhatsApp orders need a lead. A Shopee/Tokopedia buyer may have no lead:
    // then the buyer's name is required instead.
    if (!leadIdentifier) {
      if (!isMarketplace) {
        return errorResponse(
          "lead wajib diisi untuk order WhatsApp (nomor WA lead). Order Shopee/Tokopedia boleh tanpa lead: tulis order_type dan name (nama pembeli).",
          400,
        );
      }
      if (!buyerName) {
        return errorResponse(
          `name wajib diisi untuk order ${label} tanpa lead (nama pembeli dari pesanan ${label})`,
          400,
        );
      }
    } else if (buyerName) {
      return errorResponse(
        "name hanya untuk order Shopee/Tokopedia tanpa lead. Kalau pakai lead, nama diambil dari lead (ubah lewat !updateleads).",
        400,
      );
    }
    if (buyerName.length > 200) return errorResponse("name maksimal 200 karakter", 400);
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

    let leadId: string | null = null;
    if (leadIdentifier) {
      const leadResult = await resolveLeadIdentifier(leadIdentifier);
      if (!leadResult.data) {
        const hint = isMarketplace
          ? `. Kalau pembeli ${label} ini bukan lead, hapus baris lead dan tulis name (nama pembeli).`
          : "";
        return errorResponse(`${leadResult.error}${hint}`, 404);
      }
      leadId = leadResult.data.id;
    }

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

    const rpcArgs: Record<string, unknown> = {
      p_lead_id: leadId,
      p_shipping_address: shippingAddress,
      p_shipping_regional: shippingRegional,
      p_shipping_zip: shippingZip || null,
      p_items: Array.from(merged.values()),
      p_discount_amount: discountAmount,
      p_payment_type: paymentType,
      p_note: note || null,
      p_discord_message_id: auth.context!.messageId,
    };
    // Extra arguments are sent only when needed, so orders that do not use
    // them keep working on a database that has not run the newest migration.
    if (isMarketplace) {
      rpcArgs.p_order_source = orderSource;
      rpcArgs.p_marketplace_fee = marketplaceFee;
      rpcArgs.p_marketplace_order_no = marketplaceOrderNo || null;
    }
    if (!leadId) rpcArgs.p_buyer_name = buyerName;

    const { data: result, error: createError } = await supabaseAdmin.rpc(
      "create_discord_invoice",
      rpcArgs,
    );

    if (createError?.code === "PGRST202") {
      return errorResponse(
        `Database belum di-update untuk order ${label}${leadId ? "" : " tanpa lead"}. Jalankan migration 20261103090000_allow_marketplace_invoice_without_lead.sql di Supabase.`,
        503,
      );
    }
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

    // Shopee/Tokopedia orders are saved as paid by the database. An unpaid one
    // means migration 20261104090000 has not run yet.
    const setupWarning =
      isMarketplace && !orderResult.data.is_paid && orderResult.data.status !== "cancelled"
        ? `Database belum di-update: order ${label} ini belum otomatis lunas. Jalankan migration 20261104090000_auto_paid_marketplace_invoices.sql di Supabase (order ini ikut diperbaiki).`
        : null;

    return successResponse(
      { ...orderResult.data, duplicate: result.duplicate === true, setup_warning: setupWarning },
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
