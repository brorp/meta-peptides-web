import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendOrderVerifiedEmail } from "@/lib/email-service";
import { renderInvoicePdfBuffer } from "@/lib/pdf/generate-invoice";
import {
  isMissingCustomerUsernameColumn,
  withoutCustomerUsername,
} from "@/lib/order-schema-compat";

const ORDER_STATUSES = [
  "pending_review",
  "processing",
  "completed",
  "cancelled",
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*, products(name, label, volume, image_url, slug)), payments(*)")
      .eq("id", id)
      .single();

    if (error || !data) return errorResponse("Order not found", 404);

    return successResponse(data, "Order retrieved");
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { data: currentOrder, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select(
        "id, status, shipping_email, shipping_name, subtotal, total_price, voucher_code, voucher_discount_amount, created_at",
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

    if (!Object.keys(updateData).length) {
      return errorResponse("No order changes were provided", 400);
    }

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

    if (updateError || !updatedOrder) {
      return errorResponse(updateError?.message || "Failed to update order", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*, products(name, label, volume, image_url, slug)), payments(*)")
      .eq("id", id)
      .single();

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
    return errorResponse(err.message, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return errorResponse("Order not found", 404);
    }

    await supabaseAdmin.from("payments").delete().eq("order_id", id);
    await supabaseAdmin.from("order_items").delete().eq("order_id", id);

    const { error } = await supabaseAdmin.from("orders").delete().eq("id", id);

    if (error) return errorResponse(error.message, 400);

    return successResponse(null, "Order deleted");
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
