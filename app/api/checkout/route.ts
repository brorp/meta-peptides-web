export const dynamic = "force-dynamic";

import { errorResponse, successResponse } from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const supabaseServer = await createClientCookies();

    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const orderDataRaw = formData.get("orderData") as string;

    if (!file) return errorResponse("Payment receipt is required", 400);
    const orderData = JSON.parse(orderDataRaw);

    // --- STEP 1: UPLOAD IMAGE ---
    const fileExt = file.name.split(".").pop();
    const fileName = `TRX-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const filePath = `${fileName}.${fileExt}`;

    const { error: uploadError } = await supabaseServer.storage
      .from("transactions")
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      console.error("Supabase Upload Error:", uploadError);
      return errorResponse("Failed to upload receipt", 500);
    }

    const {
      data: { publicUrl },
    } = supabaseServer.storage.from("transactions").getPublicUrl(filePath);

    // --- STEP 2: INSERT KE TABEL ORDERS ---
    const { data: order, error: orderError } = await supabaseServer
      .from("orders")
      .insert({
        user_id: user ? user.id : null,
        total_price: orderData.total_price,
        is_guest: !user ? true : false,
        subtotal: orderData.subtotal,
        shipping_address: orderData.shipping_address,
        shipping_regional: orderData.shipping_regional,
        shipping_name: orderData.shipping_name,
        shipping_phone: orderData.shipping_phone,
        shipping_zip: orderData.shipping_zip,
        shipping_email: orderData.shipping_email,
        note: orderData.note,
        voucher_code: orderData.voucher_code,
        status: "pending_review",
      })
      .select()
      .single();

    if (orderError) {
      await supabaseServer.storage.from("transactions").remove([filePath]);
      return errorResponse(orderError.message, 500);
    }

    // --- STEP 3: INSERT KE TABEL ORDER_ITEMS ---
    const orderItems = orderData.items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.price_at_purchase,
    }));

    const { error: itemsError } = await supabaseServer
      .from("order_items")
      .insert(orderItems);
    if (itemsError) return errorResponse(itemsError.message, 500);

    // --- STEP 4: INSERT KE TABEL PAYMENTS ---
    const { error: paymentError } = await supabaseServer
      .from("payments")
      .insert({
        order_id: order.id,
        receipt_url: publicUrl,
        transaction_code: fileName,
        sender_name: orderData.shipping_name,
        status: "pending",
      });

    if (paymentError) return errorResponse(paymentError.message, 500);

    return successResponse(
      { orderId: order.id, transaction_code: fileName },
      "Order placed successfully",
    );
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
