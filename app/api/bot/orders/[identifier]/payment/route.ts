import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readDiscordBotJson } from "@/lib/discord-bot-auth";
import {
  getJakartaDate,
  isMarketplaceOrderSource,
  marketplaceLabel,
  normalizePaymentType,
  parseDateOnly,
  resolveOrderIdentifier,
} from "@/lib/discord-bot-data";
import { loadBotOrderDetail } from "@/lib/discord-bot-orders";
import { supabaseAdmin } from "@/lib/supabase-server";

const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const ALLOWED_PROOF_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const DISCORD_CDN_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

function hasValidImageSignature(buffer: Buffer, contentType: string) {
  if (contentType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  if (contentType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

// Shopee/Tokopedia invoices are paid inside the marketplace and saved as paid
// by !invoice, so !payment is never needed for them.
function alreadyPaidMessage(order: { order_source?: string | null }, reference: string) {
  if (isMarketplaceOrderSource(order.order_source)) {
    const label = marketplaceLabel(order.order_source);
    return `Invoice ${reference} adalah order ${label}: sudah otomatis lunas saat !invoice (dibayar di ${label}), jadi tidak perlu !payment.`;
  }
  return `Invoice ${reference} sudah lunas. Kalau ada koreksi, ubah lewat panel.`;
}

// !payment <invoice> + payment proof image
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  let uploadedPath: string | null = null;

  try {
    const auth = await readDiscordBotJson(req, { maxRequestsPerMinute: 20 });
    if (auth.response) return auth.response;

    // A retried Discord message returns the payment it already recorded.
    const { data: replayPayment } = await supabaseAdmin
      .from("payments")
      .select("order_id")
      .eq("discord_message_id", auth.context!.messageId)
      .maybeSingle();
    if (replayPayment?.order_id) {
      const replayOrder = await loadBotOrderDetail(replayPayment.order_id);
      return successResponse({ ...replayOrder.data, duplicate: true }, "Payment sudah dicatat");
    }

    const { identifier } = await params;
    const orderResult = await resolveOrderIdentifier(decodeURIComponent(identifier));
    if (!orderResult.data) return errorResponse(orderResult.error, 404);
    const order = orderResult.data;
    const reference = order.invoice_number || order.manual_reference || order.id;

    if (order.status === "cancelled" || order.status === "reject") {
      return errorResponse(`Invoice ${reference} sudah dibatalkan`, 400);
    }
    if (order.is_paid) {
      return errorResponse(alreadyPaidMessage(order, reference), 409);
    }

    const body = auth.body || {};
    const amount = Number(body.amount);
    const paymentType = normalizePaymentType(body.payment_type);
    const paymentDateText = body.payment_date ? parseDateOnly(body.payment_date) : getJakartaDate();
    const proofUrlText = String(body.proof_url || "").trim();
    const claimedContentType = String(body.proof_content_type || "").toLowerCase();
    const claimedSize = Number(body.proof_size || 0);

    if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999_999) {
      return errorResponse("amount wajib diisi nominal > 0 (contoh 2500000)", 400);
    }
    if (!paymentType) {
      return errorResponse("payment_type harus Bank Transfer, QRIS, Shopee, atau Tokopedia", 400);
    }
    if (!paymentDateText) {
      return errorResponse("payment_date wajib format YYYY-MM-DD", 400);
    }
    if (!proofUrlText) return errorResponse("Bukti pembayaran (gambar) wajib diupload", 400);
    if (!ALLOWED_PROOF_TYPES[claimedContentType]) {
      return errorResponse("Bukti pembayaran harus gambar JPG, PNG, atau WebP", 400);
    }
    if (!Number.isFinite(claimedSize) || claimedSize <= 0 || claimedSize > MAX_PROOF_SIZE) {
      return errorResponse("Ukuran bukti pembayaran maksimal 5 MB", 400);
    }

    let proofUrl: URL;
    try {
      proofUrl = new URL(proofUrlText);
    } catch {
      return errorResponse("URL bukti pembayaran tidak valid", 400);
    }
    if (proofUrl.protocol !== "https:" || !DISCORD_CDN_HOSTS.has(proofUrl.hostname)) {
      return errorResponse("Bukti pembayaran harus diupload langsung di Discord", 400);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let proofResponse: Response;
    try {
      proofResponse = await fetch(proofUrl, {
        signal: controller.signal,
        redirect: "error",
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!proofResponse.ok) return errorResponse("Gagal mengunduh bukti pembayaran dari Discord", 400);
    const responseLength = Number(proofResponse.headers.get("content-length") || 0);
    if (Number.isFinite(responseLength) && responseLength > MAX_PROOF_SIZE) {
      return errorResponse("Ukuran bukti pembayaran maksimal 5 MB", 400);
    }
    const responseType = String(proofResponse.headers.get("content-type") || "")
      .split(";")[0]
      .toLowerCase();
    if (!ALLOWED_PROOF_TYPES[responseType]) {
      return errorResponse("Bukti pembayaran harus gambar JPG, PNG, atau WebP", 400);
    }

    const proofBuffer = Buffer.from(await proofResponse.arrayBuffer());
    if (!proofBuffer.length || proofBuffer.length > MAX_PROOF_SIZE) {
      return errorResponse("Ukuran bukti pembayaran maksimal 5 MB", 400);
    }
    if (!hasValidImageSignature(proofBuffer, responseType)) {
      return errorResponse("File bukti pembayaran bukan gambar yang valid", 400);
    }

    uploadedPath = `discord/${order.id}/${randomUUID()}.${ALLOWED_PROOF_TYPES[responseType]}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("payment-proofs")
      .upload(uploadedPath, proofBuffer, {
        contentType: responseType,
        upsert: false,
      });
    if (uploadError) {
      uploadedPath = null;
      return errorResponse("Gagal menyimpan bukti pembayaran (cek bucket payment-proofs)", 500);
    }

    const { data: paymentResult, error: paymentError } = await supabaseAdmin.rpc(
      "mark_discord_order_paid",
      {
        p_order_id: order.id,
        p_payment_amount: amount,
        p_payment_type: paymentType,
        p_payment_date: `${paymentDateText}T00:00:00+07:00`,
        p_proof_storage_path: uploadedPath,
        p_discord_message_id: auth.context!.messageId,
      },
    );

    if (paymentError) {
      await supabaseAdmin.storage.from("payment-proofs").remove([uploadedPath]);
      uploadedPath = null;
      return errorResponse(paymentError.message || "Gagal mencatat pembayaran", 400);
    }

    if (paymentResult?.duplicate === true) {
      // A concurrent retry may finish after both requests uploaded a file.
      // Keep the proof already linked by the first request and remove ours.
      await supabaseAdmin.storage.from("payment-proofs").remove([uploadedPath]);
    }
    // The RPC now owns the proof path (or the duplicate was removed), so a
    // later rendering error must not delete a proof referenced by a payment.
    uploadedPath = null;

    const detailResult = await loadBotOrderDetail(order.id);
    if (!detailResult.data) {
      return errorResponse("Pembayaran tercatat tapi invoice gagal dimuat. Cek di panel.", 500);
    }

    return successResponse(
      {
        ...detailResult.data,
        duplicate: paymentResult?.duplicate === true,
        payment_difference: amount - Number(detailResult.data.total_price || 0),
      },
      "Pembayaran dicatat",
    );
  } catch {
    if (uploadedPath) {
      await supabaseAdmin.storage.from("payment-proofs").remove([uploadedPath]);
    }
    return errorResponse("Gagal mencatat pembayaran", 500);
  }
}
