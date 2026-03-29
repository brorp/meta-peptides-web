import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendOrderVerifiedEmail } from "@/lib/email-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*, products(name, image_url, slug)), payments(*)")
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

    if (body.status) updateData.status = body.status;
    if (
      body.tracking_number !== undefined &&
      String(body.tracking_number).trim().length > 0
    ) {
      updateData.tracking_number = body.tracking_number;
    }
    if (body.note !== undefined) updateData.note = body.note;

    if (!Object.keys(updateData).length) {
      return errorResponse("No order changes were provided", 400);
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select("id")
      .single();

    if (updateError || !updatedOrder) {
      return errorResponse(updateError?.message || "Failed to update order", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*, products(name, image_url, slug)), payments(*)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return errorResponse("Order updated, but failed to load the latest data", 500);
    }

    // Trigger email when status changes TO "processing" from a different status
    if (
      body.status === "processing" &&
      previousStatus !== "processing" &&
      data.shipping_email
    ) {
      const emailItems = (data.order_items || []).map((item: any) => ({
        name: item.products?.name || "Product",
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
      }));

      const transactionCode =
        data.payments?.[0]?.transaction_code || "N/A";

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
