import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendOrderVerifiedEmail } from "@/lib/email-service";
import { renderInvoicePdfBuffer } from "@/lib/pdf/generate-invoice";
import {
  isMissingCustomerUsernameColumn,
  isMissingTrackingNumberColumn,
  withoutCustomerUsername,
  withoutTrackingNumber,
  withoutTrackingNumberSelect,
} from "@/lib/order-schema-compat";
import { deductOrderInventory, normalizePaymentType } from "@/lib/inventory";
import {
  normalizeShipmentType,
  syncShipmentExpenseForOrder,
} from "@/lib/shipment-expenses";
import { requireAdminApiSession } from "@/lib/admin-api";

const ORDER_STATUSES = [
  "pending_review",
  "processing",
  "completed",
  "cancelled",
];
const ADMIN_ORDER_DETAIL_SELECT =
  "id, status, created_at, total_price, subtotal, voucher_code, voucher_discount_amount, marketplace_fee, shipping_name, shipping_phone, shipping_email, shipping_address, shipping_regional, shipping_zip, customer_username, note, tracking_number, order_source, manual_channel, manual_reference, shipping_fee, shipment_type, order_items(id, product_id, quantity, price_at_purchase, products(name, label, volume, image_url, slug)), payments(id, transaction_code, payment_type, status, receipt_url)";
const ADMIN_ORDER_DETAIL_SELECT_WITHOUT_TRACKING =
  withoutTrackingNumberSelect(ADMIN_ORDER_DETAIL_SELECT);

const withOrderSchema = (order: any, trackingNumberSupported: boolean) =>
  order
    ? {
        ...order,
        _schema: {
          tracking_number: trackingNumberSupported,
        },
      }
    : order;

const loadAdminOrderDetail = async (id: string) => {
  let { data, error } = await supabaseAdmin
    .from("orders")
    .select(ADMIN_ORDER_DETAIL_SELECT)
    .eq("id", id)
    .single();

  if (error && isMissingTrackingNumberColumn(error)) {
    const fallback = await supabaseAdmin
      .from("orders")
      .select(ADMIN_ORDER_DETAIL_SELECT_WITHOUT_TRACKING)
      .eq("id", id)
      .single();

    data = fallback.data as any;
    error = fallback.error;
    return {
      data: withOrderSchema(data, false),
      error,
    };
  }

  return {
    data: withOrderSchema(data, true),
    error,
  };
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const { id } = await params;

    const { data, error } = await loadAdminOrderDetail(id);

    if (error || !data) return errorResponse("Order not found", 404);

    return successResponse(data, "Order retrieved");
  } catch (err: any) {
    return errorResponse("Failed to load order", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await req.json();

    const { data: currentOrder, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select(
        "id, status, order_source, shipping_email, shipping_name, subtotal, total_price, voucher_code, voucher_discount_amount, shipment_type, shipping_fee, created_at",
      )
      .eq("id", id)
      .single();

    if (fetchError || !currentOrder) {
      return errorResponse("Order not found", 404);
    }

    const previousStatus = currentOrder.status;
    const updateData: any = {};

    if (body.status) {
      if (!ORDER_STATUSES.includes(body.status)) {
        return errorResponse("Invalid order status", 400);
      }

      updateData.status = body.status;
    }

    for (const requiredField of [
      "shipping_name",
      "shipping_phone",
      "shipping_address",
      "shipping_regional",
    ]) {
      if (body[requiredField] !== undefined) {
        const value = String(body[requiredField] || "").trim();
        if (!value) {
          return errorResponse(`${requiredField.replace(/_/g, " ")} is required`, 400);
        }

        updateData[requiredField] = value;
      }
    }

    if (body.shipping_email !== undefined) {
      const email = String(body.shipping_email || "").trim().toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return errorResponse("Customer email is invalid", 400);
      }

      updateData.shipping_email = email || null;
    }

    if (body.shipping_zip !== undefined) {
      updateData.shipping_zip = String(body.shipping_zip || "").trim() || null;
    }

    if (body.shipment_type !== undefined) {
      updateData.shipment_type = normalizeShipmentType(body.shipment_type);
    }

    if (body.customer_username !== undefined) {
      updateData.customer_username =
        String(body.customer_username || "").trim() || null;
    }

    if (
      body.tracking_number !== undefined &&
      String(body.tracking_number).trim().length > 0
    ) {
      updateData.tracking_number = body.tracking_number;
    }
    if (body.note !== undefined) updateData.note = body.note;

    for (const moneyField of [
      "subtotal",
      "total_price",
      "voucher_discount_amount",
      "shipping_fee",
      "marketplace_fee",
    ]) {
      if (body[moneyField] !== undefined) {
        const amount = Number(body[moneyField]);
        if (!Number.isFinite(amount) || amount < 0) {
          return errorResponse(`${moneyField.replace(/_/g, " ")} is invalid`, 400);
        }

        updateData[moneyField] = amount;
      }
    }

    // Allow updating the order date
    if (body.created_at !== undefined) {
      const parsedDate = new Date(body.created_at);
      if (!isNaN(parsedDate.getTime())) {
        updateData.created_at = parsedDate.toISOString();
      }
    }

    const shouldUpdatePaymentType = body.payment_type !== undefined;

    if (!Object.keys(updateData).length && !shouldUpdatePaymentType) {
      return errorResponse("No order changes were provided", 400);
    }

    if (Object.keys(updateData).length) {
      let { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from("orders")
        .update(updateData)
        .eq("id", id)
        .select("id")
        .single();

      if (updateError && isMissingCustomerUsernameColumn(updateError)) {
        const retry = await supabaseAdmin
          .from("orders")
          .update(withoutCustomerUsername(updateData))
          .eq("id", id)
          .select("id")
          .single();

        updatedOrder = retry.data;
        updateError = retry.error;
      }

      if (
        updateError &&
        isMissingTrackingNumberColumn(updateError) &&
        updateData.tracking_number !== undefined
      ) {
        const retryUpdateData = withoutTrackingNumber(updateData);

        if (Object.keys(retryUpdateData).length) {
          const retry = await supabaseAdmin
            .from("orders")
            .update(retryUpdateData)
            .eq("id", id)
            .select("id")
            .single();

          updatedOrder = retry.data;
          updateError = retry.error;
        } else {
          updatedOrder = { id };
          updateError = null;
        }
      }

      if (updateError || !updatedOrder) {
        return errorResponse("Failed to update order", 400);
      }
    }

    if (shouldUpdatePaymentType) {
      const paymentType = normalizePaymentType(body.payment_type);
      const { data: existingPayment, error: paymentLookupError } =
        await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("order_id", id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

      if (paymentLookupError) {
        return errorResponse("Failed to update payment type", 400);
      }

      if (existingPayment?.id) {
        const { error: paymentUpdateError } = await supabaseAdmin
          .from("payments")
          .update({ payment_type: paymentType })
          .eq("id", existingPayment.id);

        if (paymentUpdateError) {
          return errorResponse("Failed to update payment type", 400);
        }
      } else {
        const { error: paymentInsertError } = await supabaseAdmin
          .from("payments")
          .insert({
            order_id: id,
            receipt_url: "",
            transaction_code: `PAY-${id.slice(0, 8).toUpperCase()}`,
            sender_name: currentOrder.shipping_name || "Customer",
            status: "pending",
            payment_type: paymentType,
          });

        if (paymentInsertError) {
          return errorResponse("Failed to update payment type", 400);
        }
      }
    }

    try {
      await syncShipmentExpenseForOrder({
        orderId: id,
        orderSource: currentOrder.order_source,
        shippingFee:
          updateData.shipping_fee !== undefined
            ? Number(updateData.shipping_fee || 0)
            : Number(currentOrder.shipping_fee || 0),
        shipmentType:
          updateData.shipment_type !== undefined
            ? updateData.shipment_type
            : currentOrder.shipment_type,
        shippingName:
          updateData.shipping_name !== undefined
            ? updateData.shipping_name
            : currentOrder.shipping_name,
        createdAt:
          updateData.created_at !== undefined
            ? updateData.created_at
            : currentOrder.created_at,
      });
    } catch (shipmentExpenseError: any) {
      return errorResponse(
        shipmentExpenseError.message || "Failed to sync shipment expense",
        400,
      );
    }

    // Stock is deducted at order-creation time (POST /admin/orders).
    // The only exception is when an order was created with status "pending_review"
    // and is now being moved out of that state for the first time — in that case
    // inventory hasn't been touched yet, so we deduct it now.
    const isFirstActivation =
      body.status &&
      body.status !== "cancelled" &&
      previousStatus === "pending_review" &&
      body.status !== "pending_review";

    if (isFirstActivation) {
      try {
        await deductOrderInventory(id);
      } catch (inventoryError: any) {
        // Roll back the status change if inventory deduction fails
        await supabaseAdmin
          .from("orders")
          .update({ status: previousStatus })
          .eq("id", id);

        return errorResponse(
          inventoryError.message || "Failed to deduct inventory",
          400,
        );
      }
    }

    const { data, error } = await loadAdminOrderDetail(id);

    if (error || !data) {
      return errorResponse("Order updated, but failed to load the latest data", 500);
    }

    // Trigger email with invoice when status changes from pending_review to processing.
    if (
      body.status === "processing" &&
      previousStatus === "pending_review" &&
      data.shipping_email
    ) {
      const emailItems = (data.order_items || []).map((item: any) => ({
        name: item.products?.name || "Product",
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
      }));

      const transactionCode =
        data.payments?.[0]?.transaction_code || "N/A";

      let invoiceAttachment: {
        filename: string;
        content: Buffer;
        contentType?: string;
      } | null = null;

      try {
        invoiceAttachment = {
          filename: `invoice-${data.id.slice(0, 8).toUpperCase()}.pdf`,
          content: await renderInvoicePdfBuffer(data),
          contentType: "application/pdf",
        };
      } catch (invoiceError) {
        console.error(
          `[Admin] Failed to generate invoice PDF for order ${data.id}:`,
          invoiceError,
        );
      }

      const emailSent = await sendOrderVerifiedEmail({
        customerName: data.shipping_name || "Customer",
        customerEmail: data.shipping_email,
        orderId: data.id,
        transactionCode,
        items: emailItems,
        subtotal: data.subtotal || data.total_price,
        memberDiscount: 0,
        voucherCode: data.voucher_code || null,
        voucherDiscount: Number(data.voucher_discount_amount) || 0,
        totalPrice: data.total_price,
        status: "processing",
        createdAt: data.created_at,
      }, {
        invoiceAttachment,
      });

      if (!emailSent) {
        console.warn(
          `[Admin] Order-verified email was not sent for order ${data.id}.`,
        );
      }
    }

    return successResponse(data, "Order updated");
  } catch (err: any) {
    return errorResponse("Failed to update order", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const { id } = await params;

    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return errorResponse("Order not found", 404);
    }

    await supabaseAdmin
      .from("expenses")
      .delete()
      .eq("source_type", "shipment_fee")
      .eq("source_order_id", id);
    await supabaseAdmin.from("payments").delete().eq("order_id", id);
    await supabaseAdmin.from("order_items").delete().eq("order_id", id);

    const { error } = await supabaseAdmin.from("orders").delete().eq("id", id);

    if (error) return errorResponse("Failed to delete order", 400);

    return successResponse(null, "Order deleted");
  } catch (err: any) {
    return errorResponse("Failed to delete order", 500);
  }
}
