export const dynamic = "force-dynamic";

import { errorResponse, successResponse } from "@/lib/api-response";
import { createClientCookies, supabaseAdmin } from "@/lib/supabase-server";
import { withAuth } from "@/lib/wrapper-auth-server";
import { User } from "@supabase/supabase-js";
import { sendOrderCreatedEmails } from "@/lib/email-service";
import { discount as memberDiscountRate } from "@/contants/discount";

type CheckoutItemPayload = {
  product_id: string;
  quantity: number;
  price_at_purchase: number;
};

type PurchasedProductRecord = {
  id: string;
  name: string;
  is_active: boolean | null;
  complimentary_product_id?: string | null;
  complimentary_quantity?: number | null;
};

type ComplimentaryItemSummary = {
  product_id: string;
  name: string;
  quantity: number;
};

const normalizeCheckoutItems = (items: any): CheckoutItemPayload[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      product_id: String(item?.product_id || ""),
      quantity: Number(item?.quantity || 0),
      price_at_purchase: Number(item?.price_at_purchase || 0),
    }))
    .filter(
      (item) =>
        !!item.product_id &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.price_at_purchase) &&
        item.price_at_purchase >= 0,
    );
};

const cleanupFailedOrder = async (supabaseServer: any, orderId: string | null) => {
  if (!orderId) return;

  await supabaseServer.from("payments").delete().eq("order_id", orderId);
  await supabaseServer.from("order_items").delete().eq("order_id", orderId);
  await supabaseServer.from("orders").delete().eq("id", orderId);
};

const buildComplimentaryItems = async (
  supabaseServer: any,
  normalizedItems: CheckoutItemPayload[],
  productLookup: Map<string, PurchasedProductRecord>,
): Promise<{
  items: CheckoutItemPayload[];
  summaries: ComplimentaryItemSummary[];
}> => {
  const complimentaryQuantityByProduct = new Map<string, number>();

  for (const item of normalizedItems) {
    const product = productLookup.get(item.product_id);
    if (!product?.complimentary_product_id) continue;

    const complimentaryQuantity =
      Math.max(1, Number(product.complimentary_quantity || 1)) * item.quantity;

    complimentaryQuantityByProduct.set(
      product.complimentary_product_id,
      (complimentaryQuantityByProduct.get(product.complimentary_product_id) || 0) +
        complimentaryQuantity,
    );
  }

  if (!complimentaryQuantityByProduct.size) {
    return { items: [], summaries: [] };
  }

  const complimentaryProductIds = Array.from(complimentaryQuantityByProduct.keys());
  const { data: complimentaryProducts, error: complimentaryError } =
    await supabaseServer
      .from("products")
      .select("id, name")
      .in("id", complimentaryProductIds);

  if (complimentaryError) {
    throw new Error(
      `Failed to resolve complimentary items: ${complimentaryError.message}`,
    );
  }

  const complimentaryProductMap = new Map<string, { name: string }>(
    (complimentaryProducts || []).map((product: any) => [
      product.id,
      { name: product.name || "Complimentary Item" },
    ]),
  );

  const items: CheckoutItemPayload[] = [];
  const summaries: ComplimentaryItemSummary[] = [];

  for (const [complimentaryProductId, quantity] of complimentaryQuantityByProduct) {
    const complimentaryProduct = complimentaryProductMap.get(complimentaryProductId);

    if (!complimentaryProduct) {
      console.warn(
        `[Checkout] Complimentary item ${complimentaryProductId} was not found. Skipping bonus item.`,
      );
      continue;
    }

    items.push({
      product_id: complimentaryProductId,
      quantity,
      price_at_purchase: 0,
    });

    summaries.push({
      product_id: complimentaryProductId,
      name: complimentaryProduct.name || "Complimentary Item",
      quantity,
    });
  }

  return { items, summaries };
};

export const POST = withAuth(async (request: Request, user: User | null) => {
  try {
    const supabaseServer = await createClientCookies();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const orderDataRaw = formData.get("orderData") as string;

    if (!file) return errorResponse("Payment receipt is required", 400);
    if (!orderDataRaw) return errorResponse("Order data is missing", 400);

    let orderData: any = null;
    try {
      orderData = JSON.parse(orderDataRaw);
    } catch {
      return errorResponse("Invalid order data format", 400);
    }

    const normalizedItems = normalizeCheckoutItems(orderData?.items);
    if (!normalizedItems.length) {
      return errorResponse("Order must include at least one valid item", 400);
    }

    const shippingEmail = String(orderData?.shipping_email || "")
      .trim()
      .toLowerCase();

    if (!shippingEmail) {
      return errorResponse("Shipping email is required", 400);
    }

    const requiredStockByProduct = new Map<string, number>();
    for (const item of normalizedItems) {
      requiredStockByProduct.set(
        item.product_id,
        (requiredStockByProduct.get(item.product_id) || 0) + item.quantity,
      );
    }

    const productIds = Array.from(requiredStockByProduct.keys());
    const { data: availableProducts, error: productsError } = await supabaseServer
      .from("products")
      .select("id, name, is_active, complimentary_product_id, complimentary_quantity")
      .in("id", productIds);

    if (productsError) {
      return errorResponse(
        `Failed to validate selected products: ${productsError.message}`,
        500,
      );
    }

    if (!availableProducts || availableProducts.length !== productIds.length) {
      return errorResponse("Some products are no longer available", 400);
    }

    const productLookup = new Map(
      (availableProducts as PurchasedProductRecord[]).map((product) => [
        product.id,
        product,
      ]),
    );

    for (const productId of requiredStockByProduct.keys()) {
      const product = productLookup.get(productId);
      if (!product) {
        return errorResponse("Some products are no longer available", 400);
      }

      if (product.is_active === false) {
        return errorResponse(
          `${product.name || "Selected product"} is no longer available`,
          400,
        );
      }
    }

    const {
      items: complimentaryItems,
      summaries: complimentaryItemSummaries,
    } = await buildComplimentaryItems(
      supabaseServer,
      normalizedItems,
      productLookup,
    );

    const allOrderItems: CheckoutItemPayload[] = [
      ...normalizedItems,
      ...complimentaryItems,
    ];

    // --- STEP 1: UPLOAD PAYMENT PROOF ---
    const fileExt = file.name.split(".").pop();
    const fileName = `TRX-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const filePath = `${fileName}.${fileExt}`;

    const { error: uploadError } = await supabaseServer.storage
      .from("transactions")
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return errorResponse("Failed to upload receipt", 500);
    }

    const {
      data: { publicUrl },
    } = supabaseServer.storage.from("transactions").getPublicUrl(filePath);

    // --- STEP 2: CALCULATE PRICING ---
    const parsedSubtotal = Number(orderData.subtotal);
    const fallbackSubtotal = normalizedItems.reduce(
      (sum, item) => sum + item.price_at_purchase * item.quantity,
      0,
    );
    const safeSubtotal = Number.isFinite(parsedSubtotal)
      ? parsedSubtotal
      : fallbackSubtotal;

    // Member discount
    const isMember = !!user && !user.is_anonymous;
    const memberDiscountAmount = isMember ? Math.round(safeSubtotal * memberDiscountRate) : 0;
    let afterMemberDiscount = safeSubtotal - memberDiscountAmount;

    // Voucher discount
    let voucherId: string | null = null;
    let voucherCode: string | null = orderData.voucher_code || null;
    let voucherDiscountAmount = 0;

    if (voucherCode && voucherCode.trim().length > 0) {
      // Only logged-in (non-anonymous) users can use vouchers
      if (!isMember) {
        await supabaseServer.storage.from("transactions").remove([filePath]);
        return errorResponse("You must be logged in to use a voucher", 401);
      }

      const { data: voucher, error: voucherError } = await supabaseAdmin
        .from("vouchers")
        .select("*")
        .ilike("code", voucherCode.trim())
        .maybeSingle();

      if (voucherError || !voucher) {
        await supabaseServer.storage.from("transactions").remove([filePath]);
        return errorResponse("Invalid voucher code", 400);
      }

      if (!voucher.is_active) {
        await supabaseServer.storage.from("transactions").remove([filePath]);
        return errorResponse("This voucher is no longer active", 400);
      }

      const now = new Date();
      if (now < new Date(voucher.valid_from) || now > new Date(voucher.valid_until)) {
        await supabaseServer.storage.from("transactions").remove([filePath]);
        return errorResponse("This voucher has expired or is not yet valid", 400);
      }

      if (voucher.total_claimed >= voucher.max_claim_qty) {
        await supabaseServer.storage.from("transactions").remove([filePath]);
        return errorResponse("This voucher has reached its maximum usage limit", 400);
      }

      // Treat discount_nominal as a percentage, then cap the final amount.
      const discountPercentage = Number(voucher.discount_nominal);
      const maxDiscountCap = Number(voucher.max_discount_cap);

      if (
        !Number.isFinite(discountPercentage) ||
        discountPercentage <= 0 ||
        discountPercentage > 100
      ) {
        await supabaseServer.storage.from("transactions").remove([filePath]);
        return errorResponse("This voucher is misconfigured", 400);
      }

      const rawDiscount = Math.round(
        afterMemberDiscount * (discountPercentage / 100),
      );
      const cappedDiscount =
        Number.isFinite(maxDiscountCap) && maxDiscountCap > 0
          ? Math.min(rawDiscount, maxDiscountCap)
          : rawDiscount;
      voucherDiscountAmount = Math.min(cappedDiscount, afterMemberDiscount);

      voucherId = voucher.id;
      voucherCode = voucher.code;
    }

    const safeTotalPrice = Math.max(0, afterMemberDiscount - voucherDiscountAmount);

    // --- STEP 3: INSERT ORDER ---
    const { data: order, error: orderError } = await supabaseServer
      .from("orders")
      .insert({
        user_id: user?.id,
        is_guest: user?.is_anonymous,
        total_price: safeTotalPrice,
        subtotal: safeSubtotal,
        shipping_address: orderData.shipping_address,
        shipping_regional: orderData.shipping_regional,
        shipping_name: orderData.shipping_name,
        shipping_phone: orderData.shipping_phone,
        shipping_zip: orderData.shipping_zip,
        shipping_email: shippingEmail,
        note: orderData.note || null,
        voucher_code: voucherCode || null,
        voucher_id: voucherId,
        voucher_discount_amount: voucherDiscountAmount,
        status: "pending_review",
      })
      .select()
      .single();

    if (orderError) {
      await supabaseServer.storage.from("transactions").remove([filePath]);
      return errorResponse(`Order Error: ${orderError.message}`, 500);
    }

    const orderItems = allOrderItems.map((item: CheckoutItemPayload) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.price_at_purchase,
    }));

    const { error: itemsError } = await supabaseServer
      .from("order_items")
      .insert(orderItems);
    if (itemsError) {
      await cleanupFailedOrder(supabaseServer, order.id);
      await supabaseServer.storage.from("transactions").remove([filePath]);
      return errorResponse(`Items Error: ${itemsError.message}`, 500);
    }

    const { error: paymentError } = await supabaseServer
      .from("payments")
      .insert({
        order_id: order.id,
        receipt_url: publicUrl,
        transaction_code: fileName,
        sender_name: orderData.shipping_name,
        status: "pending",
      });

    if (paymentError) {
      await cleanupFailedOrder(supabaseServer, order.id);
      await supabaseServer.storage.from("transactions").remove([filePath]);
      return errorResponse(`Payment Error: ${paymentError.message}`, 500);
    }

    // --- STEP 4: INCREMENT VOUCHER CLAIM (only on successful order) ---
    if (voucherId) {
      const { error: claimError } = await supabaseAdmin.rpc("increment_field", {
        table_name: "vouchers",
        field_name: "total_claimed",
        row_id: voucherId,
        increment_by: 1,
      });

      // Fallback: manual increment
      if (claimError) {
        const { data: currentVoucher } = await supabaseAdmin
          .from("vouchers")
          .select("total_claimed")
          .eq("id", voucherId)
          .single();

        if (currentVoucher) {
          await supabaseAdmin
            .from("vouchers")
            .update({ total_claimed: (currentVoucher.total_claimed || 0) + 1 })
            .eq("id", voucherId)
            .eq("total_claimed", currentVoucher.total_claimed);
        }
      }
    }

    // --- STEP 5: RESOLVE PRODUCT NAMES FOR EMAIL ---
    const { data: productNames } = await supabaseAdmin
      .from("products")
      .select("id, name")
      .in(
        "id",
        allOrderItems.map((i) => i.product_id),
      );

    const productNameMap = new Map(
      (productNames || []).map((p: any) => [p.id, p.name]),
    );

    const emailItems = allOrderItems.map((item) => ({
      name: productNameMap.get(item.product_id) || "Product",
      quantity: item.quantity,
      price_at_purchase: item.price_at_purchase,
    }));

    // --- STEP 6: SEND EMAILS (non-blocking) ---
    const emailSendResult = await sendOrderCreatedEmails({
      customerName: orderData.shipping_name || "Customer",
      customerEmail: shippingEmail,
      orderId: order.id,
      transactionCode: fileName,
      items: emailItems,
      subtotal: safeSubtotal,
      memberDiscount: memberDiscountAmount,
      voucherCode: voucherCode,
      voucherDiscount: voucherDiscountAmount,
      totalPrice: safeTotalPrice,
      receiptUrl: publicUrl,
      status: "pending_review",
      shippingAddress: orderData.shipping_address,
      shippingRegional: orderData.shipping_regional,
      shippingZip: orderData.shipping_zip,
      shippingPhone: orderData.shipping_phone,
      createdAt: order.created_at,
    });

    if (!emailSendResult.customerSent) {
      console.warn(
        `[Checkout] Customer order email was not sent for order ${order.id}.`,
      );
    }

    if (!emailSendResult.adminSent) {
      console.warn(
        `[Checkout] Admin order email was not sent for order ${order.id}.`,
      );
    }

    return successResponse(
      {
        orderId: order.id,
        transaction_code: fileName,
        status: order.status,
        complimentary_items: complimentaryItemSummaries,
        complimentary_item_included: complimentaryItemSummaries.length > 0,
        voucher_code: voucherCode,
        voucher_discount: voucherDiscountAmount,
        member_discount: memberDiscountAmount,
      },
      "Order successfully placed.",
    );
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
});
