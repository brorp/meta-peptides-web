export const dynamic = "force-dynamic";

import { errorResponse, successResponse } from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";
import { withAuth } from "@/lib/wrapper-auth-server";
import { User } from "@supabase/supabase-js";

const FREE_BAC_WATER_NAME = "Bacteriostatic Water";
const FREE_BAC_WATER_SLUGS = ["bacteriostatic-water", "bac-water"];

type CheckoutItemPayload = {
  product_id: string;
  quantity: number;
  price_at_purchase: number;
};

type StockMutation = {
  productId: string;
  productName: string;
  previousStock: number;
  nextStock: number;
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

const findFreeBacWaterProduct = async (supabaseServer: any) => {
  const { data: slugMatches, error: slugError } = await supabaseServer
    .from("products")
    .select("id, name, slug, stock")
    .in("slug", FREE_BAC_WATER_SLUGS);

  if (slugError) {
    throw new Error(`Failed to resolve complimentary item: ${slugError.message}`);
  }

  if (slugMatches?.length) {
    const sortedBySlugPriority = [...slugMatches].sort((a, b) => {
      const aIdx = FREE_BAC_WATER_SLUGS.indexOf(a.slug || "");
      const bIdx = FREE_BAC_WATER_SLUGS.indexOf(b.slug || "");

      const normalizedA = aIdx === -1 ? 99 : aIdx;
      const normalizedB = bIdx === -1 ? 99 : bIdx;
      return normalizedA - normalizedB;
    });

    return sortedBySlugPriority[0];
  }

  const { data: fuzzyMatches, error: fuzzyError } = await supabaseServer
    .from("products")
    .select("id, name, slug, stock")
    .or(
      "name.ilike.%bacteriostatic%water%,name.ilike.%bac%water%,label.ilike.%bacteriostatic%water%",
    )
    .limit(1);

  if (fuzzyError) {
    throw new Error(`Failed to resolve complimentary item: ${fuzzyError.message}`);
  }

  return fuzzyMatches?.[0] || null;
};

const rollbackDecrementedStocks = async (
  supabaseServer: any,
  decrementedStocks: StockMutation[],
) => {
  for (const mutation of decrementedStocks) {
    const { error } = await supabaseServer
      .from("products")
      .update({ stock: mutation.previousStock })
      .eq("id", mutation.productId)
      .eq("stock", mutation.nextStock);

    if (error) {
      console.error(
        `Stock rollback failed for product ${mutation.productId}: ${error.message}`,
      );
    }
  }
};

const cleanupFailedOrder = async (supabaseServer: any, orderId: string | null) => {
  if (!orderId) return;

  await supabaseServer.from("payments").delete().eq("order_id", orderId);
  await supabaseServer.from("order_items").delete().eq("order_id", orderId);
  await supabaseServer.from("orders").delete().eq("id", orderId);
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

    const freeBacWaterProduct = await findFreeBacWaterProduct(supabaseServer);
    if (!freeBacWaterProduct) {
      return errorResponse(
        `Complimentary item "${FREE_BAC_WATER_NAME}" was not found in products.`,
        500,
      );
    }

    const allOrderItems: CheckoutItemPayload[] = [
      ...normalizedItems,
      {
        product_id: freeBacWaterProduct.id,
        quantity: 1,
        price_at_purchase: 0,
      },
    ];

    const requiredStockByProduct = new Map<string, number>();
    for (const item of allOrderItems) {
      requiredStockByProduct.set(
        item.product_id,
        (requiredStockByProduct.get(item.product_id) || 0) + item.quantity,
      );
    }

    const productIds = Array.from(requiredStockByProduct.keys());
    const { data: productStocks, error: productStocksError } = await supabaseServer
      .from("products")
      .select("id, name, stock")
      .in("id", productIds);

    if (productStocksError) {
      return errorResponse(
        `Failed to validate product stock: ${productStocksError.message}`,
        500,
      );
    }

    if (!productStocks || productStocks.length !== productIds.length) {
      return errorResponse("Some products are no longer available", 400);
    }

    const stockLookup = new Map(productStocks.map((product: any) => [product.id, product]));
    const plannedStockMutations: StockMutation[] = [];

    for (const [productId, quantityNeeded] of requiredStockByProduct.entries()) {
      const product = stockLookup.get(productId);
      if (!product) {
        return errorResponse("Some products are no longer available", 400);
      }

      const availableStock = Number(product.stock || 0);
      if (availableStock < quantityNeeded) {
        return errorResponse(
          `Insufficient stock for ${product.name || "selected product"}`,
          409,
        );
      }

      plannedStockMutations.push({
        productId,
        productName: product.name || "Product",
        previousStock: availableStock,
        nextStock: availableStock - quantityNeeded,
      });
    }

    const decrementedStocks: StockMutation[] = [];
    for (const mutation of plannedStockMutations) {
      const { data: updatedRows, error: stockUpdateError } = await supabaseServer
        .from("products")
        .update({ stock: mutation.nextStock })
        .eq("id", mutation.productId)
        .eq("stock", mutation.previousStock)
        .select("id");

      if (stockUpdateError || !updatedRows?.length) {
        await rollbackDecrementedStocks(supabaseServer, decrementedStocks);
        return errorResponse(
          `Stock changed while processing ${mutation.productName}. Please retry checkout.`,
          409,
        );
      }

      decrementedStocks.push(mutation);
    }

    // --- STEP 1: UPLOAD BUKTI ---
    const fileExt = file.name.split(".").pop();
    const fileName = `TRX-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const filePath = `${fileName}.${fileExt}`;

    const { error: uploadError } = await supabaseServer.storage
      .from("transactions")
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      await rollbackDecrementedStocks(supabaseServer, decrementedStocks);
      return errorResponse("Failed to upload receipt", 500);
    }

    const {
      data: { publicUrl },
    } = supabaseServer.storage.from("transactions").getPublicUrl(filePath);

    const parsedSubtotal = Number(orderData.subtotal);
    const fallbackSubtotal = normalizedItems.reduce(
      (sum, item) => sum + item.price_at_purchase * item.quantity,
      0,
    );
    const safeSubtotal = Number.isFinite(parsedSubtotal)
      ? parsedSubtotal
      : fallbackSubtotal;

    const parsedTotalPrice = Number(orderData.total_price);
    const safeTotalPrice = Number.isFinite(parsedTotalPrice)
      ? parsedTotalPrice
      : safeSubtotal;

    // --- STEP 2: INSERT ORDER ---
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
        shipping_email: orderData.shipping_email,
        note: orderData.note || null,
        voucher_code: orderData.voucher_code || null,
        status: "pending_review",
      })
      .select()
      .single();

    if (orderError) {
      await supabaseServer.storage.from("transactions").remove([filePath]);
      await rollbackDecrementedStocks(supabaseServer, decrementedStocks);
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
      await rollbackDecrementedStocks(supabaseServer, decrementedStocks);
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
      await rollbackDecrementedStocks(supabaseServer, decrementedStocks);
      return errorResponse(`Payment Error: ${paymentError.message}`, 500);
    }

    return successResponse(
      {
        orderId: order.id,
        transaction_code: fileName,
        status: order.status,
        complimentary_item: FREE_BAC_WATER_NAME,
      },
      "Order successfully placed.",
    );
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
});
